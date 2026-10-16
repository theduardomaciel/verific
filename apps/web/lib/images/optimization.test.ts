// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { processImageFile, type ImagePurpose } from "@/lib/images/optimization";

interface FakeContext {
	imageSmoothingQuality: string;
	drawImage: (
		bitmap: unknown,
		dx: number,
		dy: number,
		w: number,
		h: number,
	) => void;
}

interface FakeCanvas {
	width: number;
	height: number;
	drawCalls: Array<{ dx: number; dy: number; w: number; h: number }>;
	ctx: FakeContext;
	getContext: () => FakeContext;
	toBlobCalls: Array<{ type?: string; quality?: number }>;
	toBlob: (cb: (blob: Blob) => void, type?: string, quality?: number) => void;
}

const canvases: FakeCanvas[] = [];
let bitmapSize = { width: 600, height: 200 };
/** Tamanho em bytes do PNG devolvido pelo canvas fake. */
let pngBytes = 0;

function stubBrowser() {
	Object.defineProperty(window, "createImageBitmap", {
		value: vi.fn(async () => ({
			width: bitmapSize.width,
			height: bitmapSize.height,
			close: vi.fn(),
		})),
		writable: true,
		configurable: true,
	});
	vi.spyOn(document, "createElement").mockImplementation(((
		tagName: string,
	) => {
		if (tagName !== "canvas") {
			throw new Error(`unexpected element: ${tagName}`);
		}
		const drawCalls: FakeCanvas["drawCalls"] = [];
		const ctx: FakeContext = {
			imageSmoothingQuality: "low",
			drawImage: (_bitmap, dx, dy, w, h) => {
				drawCalls.push({ dx, dy, w, h });
			},
		};
		const canvas: FakeCanvas = {
			width: 0,
			height: 0,
			drawCalls,
			ctx,
			getContext: () => ctx,
			toBlobCalls: [],
			toBlob: (cb, type, quality) => {
				canvas.toBlobCalls.push({ type, quality });
				if (type === "image/png") {
					cb(new Blob([new Uint8Array(pngBytes)], { type }));
					return;
				}
				cb(new Blob(["webp"], { type: type ?? "image/webp" }));
			},
		};
		canvases.push(canvas);
		return canvas;
	}) as never);
}

afterEach(() => {
	vi.restoreAllMocks();
	canvases.length = 0;
	bitmapSize = { width: 600, height: 200 };
	pngBytes = 0;
});

function pngFile() {
	return new File(["fake"], "logo.png", { type: "image/png" });
}

describe("processImageFile", () => {
	it("centraliza o event-logo num canvas quadrado e sai em PNG", async () => {
		stubBrowser();
		const result = await processImageFile(pngFile(), "event-logo");

		expect(canvases).toHaveLength(1);
		const canvas = canvases[0]!;
		// 600x200 cabe em 512x170.67 -> 512x171, lado = 512.
		expect(canvas.width).toBe(canvas.height);
		expect(canvas.width).toBe(512);
		expect(result.width).toBe(512);
		expect(result.height).toBe(512);
		expect(result.contentType).toBe("image/png");
		expect(result.blob.type).toBe("image/png");
		// Desenho centralizado: sobra distribuída nos dois eixos.
		expect(canvas.drawCalls).toHaveLength(1);
		const [call] = canvas.drawCalls;
		expect(call!.dx).toBeCloseTo((512 - call!.w) / 2);
		expect(call!.dy).toBeCloseTo((512 - call!.h) / 2);
	});

	it("limita o logo horizontal a 768x384 sem padding e sai em PNG", async () => {
		stubBrowser();
		bitmapSize = { width: 1200, height: 400 };
		const result = await processImageFile(pngFile(), "event-logo-wide");

		const canvas = canvases[0]!;
		expect(canvas.width).toBe(768);
		expect(canvas.height).toBe(256);
		expect(result.width).toBe(768);
		expect(result.height).toBe(256);
		expect(result.contentType).toBe("image/png");
		expect(canvas.toBlobCalls[0]?.type).toBe("image/png");
	});

	it("mantém as demais finalidades em WebP e sem padding", async () => {
		stubBrowser();
		const purposes: ImagePurpose[] = [
			"event-cover",
			"event-thumbnail",
			"activity-banner",
		];
		for (const purpose of purposes) {
			canvases.length = 0;
			const result = await processImageFile(pngFile(), purpose);
			// 600x200 sem alteração (dentro de todos os máximos).
			expect(result.width).toBe(600);
			expect(result.height).toBe(200);
			expect(result.contentType).toBe("image/webp");
			expect(result.blob.type).toBe("image/webp");
			const canvas = canvases[0]!;
			expect(canvas.width).toBe(600);
			expect(canvas.height).toBe(200);
			expect(canvas.toBlobCalls[0]?.type).toBe("image/webp");
		}
	});

	it("codifica a foto do palestrante em WebP, limitada a 512x512", async () => {
		stubBrowser();
		bitmapSize = { width: 1000, height: 800 };
		const result = await processImageFile(pngFile(), "speaker");

		expect(result.contentType).toBe("image/webp");
		expect(result.blob.type).toBe("image/webp");
		expect(result.width).toBe(512);
		expect(result.height).toBe(410);
	});

	it("usa imageSmoothingQuality alto no desenho", async () => {
		stubBrowser();
		await processImageFile(pngFile(), "speaker");

		expect(canvases[0]!.ctx.imageSmoothingQuality).toBe("high");
	});

	it("cai para WebP quando o PNG passa de 400KB, com aviso", async () => {
		stubBrowser();
		pngBytes = 400 * 1024 + 1;
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		const result = await processImageFile(pngFile(), "event-logo-wide");

		expect(result.contentType).toBe("image/webp");
		expect(result.blob.type).toBe("image/webp");
		expect(warn).toHaveBeenCalledTimes(1);
	});

	it("rejeita arquivos não-imagem", async () => {
		stubBrowser();
		const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
		await expect(processImageFile(file, "event-logo")).rejects.toThrow(
			"Selecione um arquivo de imagem.",
		);
	});
});
