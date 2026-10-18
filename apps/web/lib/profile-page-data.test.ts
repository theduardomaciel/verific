import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import {
	isProfileNotFoundError,
	resolveProfilePageData,
} from "@/lib/profile-page-data";

describe("resolveProfilePageData", () => {
	const data = { shortId: "bUI7gGj4rM" };

	it("devolve os dados quando a leitura resolve", async () => {
		await expect(
			resolveProfilePageData(Promise.resolve(data)),
		).resolves.toBe(data);
	});

	it("converte o NOT_FOUND do perfil em null (a página chama notFound)", async () => {
		const notFound = new TRPCError({
			code: "NOT_FOUND",
			message: "Perfil não encontrado.",
		});

		await expect(
			resolveProfilePageData(Promise.reject(notFound)),
		).resolves.toBeNull();
	});

	it("propaga erro interno do tRPC (não cacheia 404 transitório)", async () => {
		const failure = new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "db timeout",
		});

		await expect(
			resolveProfilePageData(Promise.reject(failure)),
		).rejects.toBe(failure);
	});

	it("propaga erro que não é do tRPC", async () => {
		const bug = new Error("boom");

		await expect(resolveProfilePageData(Promise.reject(bug))).rejects.toBe(
			bug,
		);
	});
});

describe("isProfileNotFoundError", () => {
	it("reconhece TRPCError NOT_FOUND", () => {
		expect(
			isProfileNotFoundError(new TRPCError({ code: "NOT_FOUND" })),
		).toBe(true);
	});

	it("reconhece o NOT_FOUND de outra cópia de @trpc/server", () => {
		const alien = Object.assign(new Error("Perfil não encontrado."), {
			name: "TRPCError",
			code: "NOT_FOUND",
		});

		expect(isProfileNotFoundError(alien)).toBe(true);
	});

	it("recusa outros códigos e objetos que só imitam o código", () => {
		expect(
			isProfileNotFoundError(new TRPCError({ code: "BAD_REQUEST" })),
		).toBe(false);
		expect(isProfileNotFoundError({ code: "NOT_FOUND" })).toBe(false);
		expect(isProfileNotFoundError(null)).toBe(false);
		expect(isProfileNotFoundError("NOT_FOUND")).toBe(false);
	});
});
