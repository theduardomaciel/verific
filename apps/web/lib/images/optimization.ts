"use client";

export type ImagePurpose =
	| "event-logo"
	| "event-logo-wide"
	| "event-cover"
	| "event-thumbnail"
	| "speaker"
	| "activity-banner";

const PURPOSE_MAX: Record<ImagePurpose, { w: number; h: number }> = {
	"event-logo": { w: 512, h: 512 },
	"event-logo-wide": { w: 1024, h: 512 },
	"event-cover": { w: 1920, h: 1080 },
	"event-thumbnail": { w: 1200, h: 630 },
	speaker: { w: 800, h: 800 },
	"activity-banner": { w: 1600, h: 900 },
};

export interface ProcessedImage {
	blob: Blob;
	width: number;
	height: number;
	contentType: "image/webp";
}

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

function canvasToWebp(canvas: HTMLCanvasElement, quality = 0.82): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error("Falha ao converter imagem."))),
			"image/webp",
			quality,
		);
	});
}

/**
 * Otimização client-side: redimensiona para o máximo da finalidade,
 * rasteriza SVG (decisão Fase 0: vetores viram WebP, sem risco XSS),
 * remove metadados (canvas não preserva EXIF) e converte para WebP.
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
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext("2d")!;
	ctx.drawImage(bitmap, 0, 0, w, h);
	bitmap.close?.();
	const blob = await canvasToWebp(canvas);
	return { blob, width: w, height: h, contentType: "image/webp" };
}
