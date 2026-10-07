import { randomUUID } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@verific/env";

export type ImagePurpose =
	| "event-logo"
	| "event-logo-wide"
	| "event-cover"
	| "event-thumbnail"
	| "speaker"
	| "activity-banner";

interface PurposeConfig {
	maxWidth: number;
	maxHeight: number;
	maxBytes: number;
	allowedMime: readonly string[];
	outputMime: "image/webp";
	extension: "webp";
	cacheControl: string;
}

export const IMAGE_PURPOSES: Record<ImagePurpose, PurposeConfig> = {
	"event-logo": {
		maxWidth: 512,
		maxHeight: 512,
		maxBytes: 512 * 1024,
		allowedMime: ["image/png", "image/jpeg", "image/webp"],
		outputMime: "image/webp",
		extension: "webp",
		cacheControl: "public, max-age=31536000, immutable",
	},
	"event-logo-wide": {
		maxWidth: 1024,
		maxHeight: 512,
		maxBytes: 512 * 1024,
		allowedMime: ["image/png", "image/jpeg", "image/webp"],
		outputMime: "image/webp",
		extension: "webp",
		cacheControl: "public, max-age=31536000, immutable",
	},
	"event-cover": {
		maxWidth: 1920,
		maxHeight: 1080,
		maxBytes: 1024 * 1024,
		allowedMime: ["image/png", "image/jpeg", "image/webp"],
		outputMime: "image/webp",
		extension: "webp",
		cacheControl: "public, max-age=31536000, immutable",
	},
	"event-thumbnail": {
		maxWidth: 1200,
		maxHeight: 630,
		maxBytes: 512 * 1024,
		allowedMime: ["image/png", "image/jpeg", "image/webp"],
		outputMime: "image/webp",
		extension: "webp",
		cacheControl: "public, max-age=31536000, immutable",
	},
	speaker: {
		maxWidth: 800,
		maxHeight: 800,
		maxBytes: 512 * 1024,
		allowedMime: ["image/png", "image/jpeg", "image/webp"],
		outputMime: "image/webp",
		extension: "webp",
		cacheControl: "public, max-age=31536000, immutable",
	},
	"activity-banner": {
		maxWidth: 1600,
		maxHeight: 900,
		maxBytes: 1024 * 1024,
		allowedMime: ["image/png", "image/jpeg", "image/webp"],
		outputMime: "image/webp",
		extension: "webp",
		cacheControl: "public, max-age=31536000, immutable",
	},
};

export interface StorageAdapter {
	isConfigured(): boolean;
	buildKey(purpose: ImagePurpose, projectId: string): string;
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

	buildKey(purpose, projectId) {
		const safeProject = projectId.replace(/[^a-zA-Z0-9-_]/g, "");
		return `${purpose}/${safeProject}/${randomUUID()}.${IMAGE_PURPOSES[purpose]!.extension}`;
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
		const config = IMAGE_PURPOSES[key.split("/")[0] as ImagePurpose];
		if (contentType !== config?.outputMime) {
			throw new Error(
				`Tipo de arquivo inválido. Envie ${config?.outputMime}.`,
			);
		}
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
	if (input.contentType !== config.outputMime) {
		throw new Error(
			`Tipo inválido. O otimizador deve converter para ${config.outputMime}.`,
		);
	}
	if (input.contentLength <= 0 || input.contentLength > config.maxBytes) {
		throw new Error("Tamanho de arquivo inválido.");
	}
}
