import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { parseProfileLayout } from "@verific/drizzle/profile-layout";

vi.mock("@verific/drizzle", () => ({ db: {} }));
vi.mock("@verific/env", () => ({ env: {} }));

import { resolveProfileSlots } from "./profiles";

// O layout aponta para o campo da versão 1; a escolha foi feita no da versão 2
const oldField = randomUUID();
const input = {
	layout: parseProfileLayout({ subtitleFieldId: oldField }),
	fieldsById: new Map([
		[
			oldField,
			{
				id: oldField,
				key: "telefone",
				type: "text",
				required: true,
				isActive: true,
			},
		],
	]),
	answersByKey: new Map([["telefone", "+5582999990000"]]),
	visibility: new Map([["telefone", false]]),
};

describe("resolveProfileSlots", () => {
	it("esconde a pergunta oculta mesmo com o layout em outra versão", () => {
		expect(resolveProfileSlots({ ...input, owner: false }).subtitle).toBe(
			null,
		);
		expect(resolveProfileSlots({ ...input, owner: true }).subtitle).toEqual(
			{ value: "+5582999990000", hidden: true },
		);
	});
});
