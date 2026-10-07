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

import { IMAGE_PURPOSES, storage, validateUploadInput } from "./storage";

describe("storage adapter", () => {
	it("monta chaves por finalidade e projeto", () => {
		const key = storage.buildKey("event-cover", "abc-123");
		expect(key.startsWith("event-cover/abc-123/")).toBe(true);
		expect(key.endsWith(".webp")).toBe(true);
	});

	it("rejeita tipo fora do padrão WebP", () => {
		expect(() =>
			validateUploadInput({
				purpose: "speaker",
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
});
