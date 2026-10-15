// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { processImageFile, type ImagePurpose } from "@/lib/images/optimization";

interface FakeCanvas {
	width: number;
	height: number;
	drawCalls: Array<{ dx: number; dy: number; w: number; h: number }>;
	getContext: () => {
		drawImage: (
			bitmap: unknown,
			dx: number,
			dy: number,
			w: number,
			h: number,
		) => void;
	};
	toBlob: (cb: (blob: Blob) => void) => void;
}

const canvases: FakeCanvas[] = [];
let bitmapSize = { width: 600, height: 200 };

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
		const canvas: FakeCanvas = {
			width: 0,
			height: 0,
			drawCalls: [],
			getContext: () => ({
				drawImage: (
					_bitmap: unknown,
					dx: number,
					dy: number,
					w: number,
					h: number,
				) => {
					canvas.drawCalls.push({ dx, dy, w, h });
				},
			}),
			toBlob: (cb) => {
				cb(new Blob(["webp"], { type: "image/webp" }));
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
});

function pngFile() {
	return new File(["fake"], "logo.png", { type: "image/png" });
}

describe("processImageFile", () => {
	it("centraliza o event-logo num canvas quadrado", async () => {
		stubBrowser();
		const result = await processImageFile(pngFile(), "event-logo");

		expect(canvases).toHaveLength(1);
		const canvas = canvases[0]!;
		// 600x200 cabe em 512x170.67 -> 512x171, lado = 512.
		expect(canvas.width).toBe(canvas.height);
		expect(canvas.width).toBe(512);
		expect(result.width).toBe(512);
		expect(result.height).toBe(512);
		// Desenho centralizado: sobra distribuída nos dois eixos.
		expect(canvas.drawCalls).toHaveLength(1);
		const [call] = canvas.drawCalls;
		expect(call!.dx).toBeCloseTo((512 - call!.w) / 2);
		expect(call!.dy).toBeCloseTo((512 - call!.h) / 2);
	});

	it("limita o logo horizontal a 768x384 sem padding", async () => {
		stubBrowser();
		bitmapSize = { width: 1200, height: 400 };
		const result = await processImageFile(pngFile(), "event-logo-wide");

		const canvas = canvases[0]!;
		expect(canvas.width).toBe(768);
		expect(canvas.height).toBe(256);
		expect(result.width).toBe(768);
		expect(result.height).toBe(256);
	});

	it("limita a foto do palestrante a 512x512 sem padding", async () => {
		stubBrowser();
		bitmapSize = { width: 1000, height: 800 };
		const result = await processImageFile(pngFile(), "speaker");

		const canvas = canvases[0]!;
		expect(canvas.width).toBe(512);
		expect(canvas.height).toBe(410);
		expect(canvas.width).not.toBe(canvas.height);
		expect(result.width).toBe(512);
		expect(result.height).toBe(410);
	});

	it("mantém as demais finalidades sem padding", async () => {
		stubBrowser();
		const purposes: ImagePurpose[] = [
			"event-logo-wide",
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
			const canvas = canvases[0]!;
			expect(canvas.width).toBe(600);
			expect(canvas.height).toBe(200);
		}
	});

	it("rejeita arquivos não-imagem", async () => {
		stubBrowser();
		const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
		await expect(processImageFile(file, "event-logo")).rejects.toThrow(
			"Selecione um arquivo de imagem.",
		);
	});
});
