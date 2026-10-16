import { describe, expect, it, vi } from "vitest";

vi.mock("@verific/env", () => ({
	env: {
		S3_ENDPOINT: "https://ref.supabase.co/storage/v1/s3",
		S3_REGION: "auto",
		S3_BUCKET: "verific-images",
		S3_ACCESS_KEY_ID: "test",
		S3_SECRET_ACCESS_KEY: "test",
		S3_PUBLIC_BASE_URL:
			"https://ref.supabase.co/storage/v1/object/public/verific-images",
		S3_FORCE_PATH_STYLE: true,
		NEXT_PUBLIC_STORAGE_BASE_URL:
			"https://ref.supabase.co/storage/v1/object/public/verific-images",
	},
}));

import {
	extensionForContentType,
	IMAGE_PURPOSES,
	isPassthroughPurpose,
	storage,
	validateUploadInput,
} from "./storage";

describe("storage adapter", () => {
	it("monta chaves por finalidade e projeto", () => {
		const key = storage.buildKey("event-cover", "abc-123");
		expect(key.startsWith("event-cover/abc-123/")).toBe(true);
		expect(key.endsWith(".webp")).toBe(true);
	});

	it("usa .png como extensão padrão das finalidades de logo", () => {
		expect(storage.buildKey("event-logo", "abc-123").endsWith(".png")).toBe(
			true,
		);
		expect(
			storage.buildKey("event-logo-wide", "abc-123").endsWith(".png"),
		).toBe(true);
	});

	it("aceita PNG e WebP nas finalidades de logo", () => {
		for (const contentType of ["image/png", "image/webp"]) {
			expect(() =>
				validateUploadInput({
					purpose: "event-logo",
					contentType,
					contentLength: 1000,
				}),
			).not.toThrow();
			expect(() =>
				validateUploadInput({
					purpose: "event-logo-wide",
					contentType,
					contentLength: 1000,
				}),
			).not.toThrow();
		}
	});

	it("rejeita tipo fora do padrão WebP nas demais finalidades", () => {
		expect(() =>
			validateUploadInput({
				purpose: "speaker",
				contentType: "image/png",
				contentLength: 1000,
			}),
		).toThrow();
		expect(() =>
			validateUploadInput({
				purpose: "event-cover",
				contentType: "image/png",
				contentLength: 1000,
			}),
		).toThrow();
	});

	it("rejeita acima do teto da finalidade", () => {
		const max = IMAGE_PURPOSES["event-logo"]!.maxBytes;
		expect(() =>
			validateUploadInput({
				purpose: "event-logo",
				contentType: "image/webp",
				contentLength: max + 1,
			}),
		).toThrow();
	});

	it("extrai chave da URL pública", () => {
		expect(storage.extractKey("event-logo/abc/x.webp")).toBe(
			"event-logo/abc/x.webp",
		);
		expect(storage.extractKey("")).toBeNull();
	});

	it("mapeia content-type para extensão", () => {
		expect(extensionForContentType("image/png")).toBe("png");
		expect(extensionForContentType("image/webp")).toBe("webp");
		expect(extensionForContentType("image/jpeg")).toBe("jpg");
		expect(extensionForContentType("application/pdf")).toBe("pdf");
		expect(() => extensionForContentType("image/gif")).toThrow();
	});

	it("arte do crachá passa direto (sem WebP), com extensão do original", () => {
		expect(isPassthroughPurpose("badge-artwork")).toBe(true);
		expect(isPassthroughPurpose("event-logo")).toBe(false);
		const key = storage.buildKey(
			"badge-artwork",
			"abc-123",
			extensionForContentType("application/pdf"),
		);
		expect(key.startsWith("badge-artwork/abc-123/")).toBe(true);
		expect(key.endsWith(".pdf")).toBe(true);
		expect(() =>
			validateUploadInput({
				purpose: "badge-artwork",
				contentType: "application/pdf",
				contentLength: 1000,
			}),
		).not.toThrow();
		expect(() =>
			validateUploadInput({
				purpose: "badge-artwork",
				contentType: "image/webp",
				contentLength: 1000,
			}),
		).toThrow();
	});
});
