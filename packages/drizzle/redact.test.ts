import { DrizzleQueryError } from "drizzle-orm/errors";
import { inspect } from "node:util";
import { describe, expect, it } from "vitest";

import { isQueryError, redactQueryParams } from "./redact";

const TOKEN = "token-secreto";

describe("redactQueryParams", () => {
	it("tira os parâmetros do erro do Drizzle e de quem o embrulha", () => {
		const query = 'select * from "sessions" where "token" = $1';
		const dbError = new DrizzleQueryError(
			query,
			[TOKEN],
			new Error("boom"),
		);
		const wrapper = new Error(dbError.message, { cause: dbError });

		const printed = inspect(redactQueryParams(wrapper), { depth: 5 });

		expect(printed).not.toContain(TOKEN);
		expect(printed).toContain(query);
	});

	it("tira também parâmetros com quebra de linha", () => {
		const dbError = new DrizzleQueryError(
			"insert into activities (description) values ($1)",
			[`linha 1\n${TOKEN}`],
			new Error("boom"),
		);

		const printed = inspect(redactQueryParams(dbError));

		expect(printed).not.toContain(TOKEN);
		expect(printed).toContain("insert into activities");
	});

	it("tira o detail do erro do Postgres", () => {
		const pgError = Object.assign(new Error("duplicate key"), {
			detail: `Key (email)=(${TOKEN}) already exists.`,
		});
		const dbError = new DrizzleQueryError("insert into users", [], pgError);

		expect(inspect(redactQueryParams(dbError), { depth: 5 })).not.toContain(
			TOKEN,
		);
	});

	it("não trata $ da query como padrão de substituição", () => {
		const dbError = new DrizzleQueryError(
			"select '$'' from t",
			[TOKEN],
			new Error("boom"),
		);

		const redacted = redactQueryParams(dbError);

		expect(redacted.stack?.split("\n")[0]).toMatch(
			/Failed query: select '\$'' from t$/,
		);
		expect(redacted.stack).not.toContain(TOKEN);
	});

	it("tira a linha de parâmetros de uma mensagem", () => {
		expect(
			redactQueryParams(`Failed query: select 1\nparams: ${TOKEN}`),
		).toBe("Failed query: select 1");
	});

	it("não mexe em outros erros, nem nos que têm campos só de leitura", () => {
		const abort = new DOMException("abortado", "AbortError");
		const other = Object.assign(new Error("falhou\nparams: x"), {
			detail: "d",
		});

		expect(redactQueryParams(abort)).toBe(abort);
		expect(redactQueryParams(other).message).toBe("falhou\nparams: x");
		expect(other.detail).toBe("d");
	});

	it("deixa outros valores como estão", () => {
		const value = { level: "error" };

		expect(redactQueryParams(value)).toBe(value);
		expect(redactQueryParams(42)).toBe(42);
	});
});

describe("isQueryError", () => {
	it("reconhece o erro do Drizzle também como causa", () => {
		const dbError = new DrizzleQueryError(
			"select 1",
			[],
			new Error("boom"),
		);

		expect(isQueryError(dbError)).toBe(true);
		expect(isQueryError(new Error("wrap", { cause: dbError }))).toBe(true);
		expect(isQueryError(new Error("Arquivo muito grande."))).toBe(false);
	});
});
