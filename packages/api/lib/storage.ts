import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

import { env } from "@verific/env";

export type ImagePurpose =
	| "event-logo"
	| "event-logo-wide"
	| "event-cover"
	| "event-thumbnail"
	| "speaker"
	| "activity-banner"
	| "badge-artwork";

/** Tipos que o otimizador client-side entrega ao upload. */
export type UploadContentType = "image/png" | "image/webp";

// PNG preserva alpha e é renderizado por Gmail/Outlook; WebP é o padrão
// enxuto para as finalidades que não vão para e-mail.
const PNG_MIME = "image/png";
const WEBP_MIME = "image/webp";

const OPTIMIZED_CACHE_CONTROL = "public, max-age=31536000, immutable";

interface PurposeConfig {
	maxWidth: number;
	maxHeight: number;
	maxBytes: number;
	/**
	 * Tipos de saída aceitos do otimizador, em ordem de preferência. Os logos
	 * de evento são PNG (e-mail-safe); o restante continua em WebP.
	 */
	outputMime: readonly UploadContentType[];
	cacheControl: string;
}

interface PassthroughPurposeConfig {
	maxBytes: number;
	/** Uploaded as-is (no WebP conversion): sharp badge artwork. */
	allowedMime: readonly string[];
	cacheControl: string;
	passthrough: true;
}

export function isPassthroughPurpose(purpose: ImagePurpose): boolean {
	return purpose === "badge-artwork";
}

/** Extensão de arquivo para um content-type aceito no upload. */
export function extensionForContentType(contentType: string): string {
	if (contentType === "image/png") return "png";
	if (contentType === "image/jpeg") return "jpg";
	if (contentType === "image/webp") return "webp";
	if (contentType === "application/pdf") return "pdf";
	throw new Error(`Tipo de arquivo inválido: ${contentType}.`);
}

export const IMAGE_PURPOSES: Record<
	ImagePurpose,
	PurposeConfig | PassthroughPurposeConfig
> = {
	"event-logo": {
		maxWidth: 512,
		maxHeight: 512,
		maxBytes: 512 * 1024,
		outputMime: [PNG_MIME, WEBP_MIME],
		cacheControl: OPTIMIZED_CACHE_CONTROL,
	},
	"event-logo-wide": {
		maxWidth: 768,
		maxHeight: 384,
		maxBytes: 512 * 1024,
		outputMime: [PNG_MIME, WEBP_MIME],
		cacheControl: OPTIMIZED_CACHE_CONTROL,
	},
	"event-cover": {
		maxWidth: 1920,
		maxHeight: 1080,
		maxBytes: 1024 * 1024,
		outputMime: [WEBP_MIME],
		cacheControl: OPTIMIZED_CACHE_CONTROL,
	},
	"event-thumbnail": {
		maxWidth: 1200,
		maxHeight: 630,
		maxBytes: 512 * 1024,
		outputMime: [WEBP_MIME],
		cacheControl: OPTIMIZED_CACHE_CONTROL,
	},
	speaker: {
		maxWidth: 512,
		maxHeight: 512,
		maxBytes: 512 * 1024,
		outputMime: [WEBP_MIME],
		cacheControl: OPTIMIZED_CACHE_CONTROL,
	},
	"activity-banner": {
		maxWidth: 1600,
		maxHeight: 900,
		maxBytes: 1024 * 1024,
		outputMime: [WEBP_MIME],
		cacheControl: OPTIMIZED_CACHE_CONTROL,
	},
	// Arte do crachá: enviada como está (PNG/JPEG/PDF), sem conversão
	// para WebP nem redimensionamento — nitidez máxima na impressão.
	// SVG é rasterizado no cliente (≥300dpi) antes do upload.
	"badge-artwork": {
		maxBytes: 5 * 1024 * 1024,
		allowedMime: ["image/png", "image/jpeg", "application/pdf"],
		cacheControl: OPTIMIZED_CACHE_CONTROL,
		passthrough: true,
	},
};

export interface StorageAdapter {
	isConfigured(): boolean;
	buildKey(
		purpose: ImagePurpose,
		projectId: string,
		extension?: string,
	): string;
	getPublicUrl(key: string): string;
	extractKey(publicUrlOrKey: string): string | null;
	createPresignedPut(input: {
		key: string;
		contentType: string;
		contentLength: number;
	}): Promise<{ uploadUrl: string; publicUrl: string }>;
	deleteObject(key: string): Promise<void>;
}

function getConfig() {
	return {
		endpoint: env.S3_ENDPOINT,
		region: env.S3_REGION ?? "auto",
		bucket: env.S3_BUCKET,
		accessKeyId: env.S3_ACCESS_KEY_ID,
		secretAccessKey: env.S3_SECRET_ACCESS_KEY,
		publicBaseUrl: (
			env.S3_PUBLIC_BASE_URL ?? env.NEXT_PUBLIC_STORAGE_BASE_URL
		)?.replace(/\/$/, ""),
		forcePathStyle: env.S3_FORCE_PATH_STYLE ?? true,
	};
}

function createS3Client() {
	const { endpoint, region, accessKeyId, secretAccessKey, forcePathStyle } =
		getConfig();
	return new S3Client({
		endpoint,
		region,
		forcePathStyle,
		credentials:
			accessKeyId && secretAccessKey
				? { accessKeyId, secretAccessKey }
				: undefined,
	});
}

/** Extensão padrão de uma finalidade quando o caller não informa uma. */
function defaultExtension(purpose: ImagePurpose): string {
	const config = IMAGE_PURPOSES[purpose];
	if (!config || "passthrough" in config) return "bin";
	return config.outputMime[0] === PNG_MIME ? "png" : "webp";
}

function assertAllowedContentType(
	purpose: ImagePurpose,
	contentType: string,
): void {
	const config = IMAGE_PURPOSES[purpose];
	if (!config) throw new Error("Finalidade de imagem inválida.");
	if ("passthrough" in config) {
		if (!config.allowedMime.includes(contentType)) {
			throw new Error(
				`Tipo de arquivo inválido. Envie ${config.allowedMime.join(", ")}.`,
			);
		}
		return;
	}
	if (!config.outputMime.includes(contentType as UploadContentType)) {
		throw new Error(
			`Tipo inválido. O otimizador deve converter para ${config.outputMime.join(" ou ")}.`,
		);
	}
}

export const storage: StorageAdapter = {
	isConfigured() {
		const {
			endpoint,
			bucket,
			accessKeyId,
			secretAccessKey,
			publicBaseUrl,
		} = getConfig();
		return Boolean(
			endpoint &&
			bucket &&
			accessKeyId &&
			secretAccessKey &&
			publicBaseUrl,
		);
	},

	buildKey(purpose, projectId, extension?: string) {
		const safeProject = projectId.replace(/[^a-zA-Z0-9-_]/g, "");
		const ext = extension ?? defaultExtension(purpose);
		return `${purpose}/${safeProject}/${randomUUID()}.${ext}`;
	},

	getPublicUrl(key) {
		const { publicBaseUrl } = getConfig();
		if (!publicBaseUrl) throw new Error("Armazenamento não configurado.");
		const cleanKey = key.replace(/^\/+/, "");
		return `${publicBaseUrl}/${cleanKey}`;
	},

	extractKey(publicUrlOrKey) {
		if (!publicUrlOrKey) return null;
		const { publicBaseUrl, bucket } = getConfig();
		if (publicBaseUrl && publicUrlOrKey.startsWith(publicBaseUrl)) {
			return publicUrlOrKey
				.slice(publicBaseUrl.length)
				.replace(/^\/+/, "");
		}
		if (bucket && publicUrlOrKey.includes(`/${bucket}/`)) {
			return publicUrlOrKey.split(`/${bucket}/`).pop() ?? null;
		}
		if (!publicUrlOrKey.startsWith("http")) return publicUrlOrKey;
		return null;
	},

	async createPresignedPut({ key, contentType, contentLength }) {
		const { bucket } = getConfig();
		if (!this.isConfigured() || !bucket) {
			throw new Error(
				"Armazenamento S3 não configurado. Defina S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY e S3_PUBLIC_BASE_URL.",
			);
		}
		const purpose = key.split("/")[0] as ImagePurpose;
		const config = IMAGE_PURPOSES[purpose];
		assertAllowedContentType(purpose, contentType);
		if (contentLength > (config?.maxBytes ?? 0)) {
			throw new Error("Arquivo excede o tamanho máximo permitido.");
		}
		const client = createS3Client();
		const command = new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			ContentType: contentType,
			ContentLength: contentLength,
			CacheControl: config?.cacheControl,
		});
		const uploadUrl = await getSignedUrl(client, command, {
			expiresIn: 300,
		});
		return { uploadUrl, publicUrl: this.getPublicUrl(key) };
	},

	async deleteObject(key) {
		const { bucket } = getConfig();
		if (!this.isConfigured() || !bucket || !key) return;
		const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
		const client = createS3Client();
		await client.send(
			new DeleteObjectCommand({ Bucket: bucket, Key: key }),
		);
	},
};

export function validateUploadInput(input: {
	purpose: ImagePurpose;
	contentType: string;
	contentLength: number;
}) {
	const config = IMAGE_PURPOSES[input.purpose];
	if (!config) throw new Error("Finalidade de imagem inválida.");
	assertAllowedContentType(input.purpose, input.contentType);
	if (input.contentLength <= 0 || input.contentLength > config.maxBytes) {
		throw new Error("Tamanho de arquivo inválido.");
	}
}
