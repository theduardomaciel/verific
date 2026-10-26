"use client";

export type ImagePurpose =
	| "event-logo"
	| "event-logo-wide"
	| "event-cover"
	| "event-thumbnail"
	| "speaker"
	| "activity-banner";

/** Estrutura do arquivo otimizado entregue ao upload. */
export interface ProcessedImage {
	blob: Blob;
	width: number;
	height: number;
	contentType: "image/png" | "image/webp";
}

const PURPOSE_MAX: Record<ImagePurpose, { w: number; h: number }> = {
	"event-logo": { w: 512, h: 512 },
	"event-logo-wide": { w: 768, h: 384 },
	"event-cover": { w: 1920, h: 1080 },
	"event-thumbnail": { w: 1200, h: 630 },
	speaker: { w: 512, h: 512 },
	"activity-banner": { w: 1600, h: 900 },
};

/**
 * Finalidades cujo arquivo armazenado deve ser quadrado: o canvas é
 * estendido com fundo transparente (`contain` centralizado) em vez de
 * apenas limitado ao máximo. Vale para o logo do evento — o slot é
 * "Logo quadrada" e o favicon/ícones consomem o arquivo cru, então um
 * envio horizontal ficava esticado na aba do navegador.
 */
const PURPOSE_SQUARE: Record<ImagePurpose, boolean> = {
	"event-logo": true,
	"event-logo-wide": false,
	"event-cover": false,
	"event-thumbnail": false,
	speaker: false,
	"activity-banner": false,
};

/**
 * Finalidades codificadas como PNG (lossless, alpha preservado). O e-mail de
 * confirmação usa o arquivo armazenado direto: o proxy do Gmail recomprime
 * WebP com perdas e achata o alpha (caixa preta, pixelização) e o Outlook
 * desktop não renderiza WebP. As demais finalidades continuam em WebP.
 */
const PURPOSE_PNG: Record<ImagePurpose, boolean> = {
	"event-logo": true,
	"event-logo-wide": true,
	"event-cover": false,
	"event-thumbnail": false,
	speaker: false,
	"activity-banner": false,
};

const WEBP_QUALITY = 0.82;

/**
 * Acima deste tamanho o PNG do logo deixa de valer a pena: cai para WebP
 * (com aviso no console). Os logos são arte chapada pequena, então 400KB
 * cobre a esmagadora maioria dos casos.
 */
const PNG_MAX_BYTES = 400 * 1024;

function fit(w: number, h: number, maxW: number, maxH: number) {
	const scale = Math.min(1, maxW / w, maxH / h);
	return {
		w: Math.max(1, Math.round(w * scale)),
		h: Math.max(1, Math.round(h * scale)),
	};
}

async function fileToBitmap(file: File | Blob): Promise<ImageBitmap> {
	if ("createImageBitmap" in window) {
		return createImageBitmap(file);
	}
	const url = URL.createObjectURL(file);
	try {
		const img = new Image();
		img.decoding = "async";
		img.src = url;
		await img.decode();
		const canvas = document.createElement("canvas");
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		const ctx = canvas.getContext("2d")!;
		ctx.drawImage(img, 0, 0);
		return createImageBitmap(canvas);
	} finally {
		URL.revokeObjectURL(url);
	}
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	type: "image/png" | "image/webp",
	quality?: number,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) =>
				blob
					? resolve(blob)
					: reject(new Error("Falha ao converter imagem.")),
			type,
			quality,
		);
	});
}

/**
 * Codifica o canvas como PNG. Se o arquivo passar do teto (raro, típico de
 * arte com degradê/foto), cai para WebP e avisa — o logo perde a garantia de
 * e-mail, mas mantém o upload possível.
 */
async function encodePngOrFallback(
	canvas: HTMLCanvasElement,
): Promise<{ blob: Blob; contentType: ProcessedImage["contentType"] }> {
	const png = await canvasToBlob(canvas, "image/png");
	if (png.size <= PNG_MAX_BYTES) {
		return { blob: png, contentType: "image/png" };
	}
	console.warn(
		`[images] PNG excedeu ${Math.round(PNG_MAX_BYTES / 1024)}KB (${Math.round(png.size / 1024)}KB); usando WebP.`,
	);
	const webp = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
	return { blob: webp, contentType: "image/webp" };
}

/**
 * Otimização client-side: redimensiona para o máximo da finalidade,
 * rasteriza SVG (vetores viram bitmap, sem risco de XSS),
 * remove metadados (canvas não preserva EXIF) e codifica. As finalidades de
 * logo saem em PNG; as demais em WebP. Finalidades quadradas
 * (`event-logo`) são centralizadas num canvas 1:1 transparente.
 */
export async function processImageFile(
	file: File,
	purpose: ImagePurpose,
): Promise<ProcessedImage> {
	if (!file.type.startsWith("image/")) {
		throw new Error("Selecione um arquivo de imagem.");
	}
	const max = PURPOSE_MAX[purpose]!;
	const bitmap = await fileToBitmap(file);
	const { w, h } = fit(bitmap.width, bitmap.height, max.w, max.h);
	const side = Math.max(w, h);
	const canvas = document.createElement("canvas");
	canvas.width = PURPOSE_SQUARE[purpose] ? side : w;
	canvas.height = PURPOSE_SQUARE[purpose] ? side : h;
	const ctx = canvas.getContext("2d")!;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(
		bitmap,
		(canvas.width - w) / 2,
		(canvas.height - h) / 2,
		w,
		h,
	);
	bitmap.close?.();
	const encoded = PURPOSE_PNG[purpose]
		? await encodePngOrFallback(canvas)
		: {
				blob: await canvasToBlob(canvas, "image/webp", WEBP_QUALITY),
				contentType: "image/webp" as const,
			};
	return {
		blob: encoded.blob,
		width: canvas.width,
		height: canvas.height,
		contentType: encoded.contentType,
	};
}
