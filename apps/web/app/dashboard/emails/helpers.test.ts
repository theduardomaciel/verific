// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	buildDiagnostic,
	copyText,
	errorTextOf,
	maskEmail,
	statusLabelOf,
} from "./helpers";

import type { EmailsListItem } from "./helpers";

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function row(overrides: Partial<EmailsListItem> = {}): EmailsListItem {
	return {
		id: "11111111-1111-4111-8111-111111111111",
		type: "event_registration_confirmation",
		idempotencyKey:
			"event_registration_confirmation:11111111-1111-4111-8111-111111111111",
		eventId: "22222222-2222-4222-8222-222222222222",
		recipientEmail: "abigail@ic.ufal.br",
		subject: "Inscrição confirmada",
		templateVersion: "v3",
		status: "failed",
		skipReason: null,
		propsHash: "a".repeat(64),
		entityRefs: {
			registrationId: "11111111-1111-4111-8111-111111111111",
		},
		stuck: false,
		attempts: 3,
		lastError: "validation_error: bad address",
		lastErrorRetryable: false,
		provider: "resend",
		providerMessageId: null,
		createdAt: new Date("2026-10-18T12:00:00.000Z"),
		updatedAt: new Date("2026-10-18T12:05:00.000Z"),
		sentAt: null,
		...overrides,
	} as EmailsListItem;
}

describe("maskEmail", () => {
	it("keeps two local chars and the domain", () => {
		expect(maskEmail("abigail@ic.ufal.br")).toBe("ab***@ic.ufal.br");
	});

	it("never leaks the full local part", () => {
		expect(maskEmail("a@b.com")).toBe("a***@b.com");
		expect(maskEmail("not-an-email")).toBe("***");
		expect(maskEmail("name@")).toBe("***");
	});
});

describe("statusLabelOf", () => {
	it("splits sending into fresh vs stuck", () => {
		expect(statusLabelOf({ status: "sending", stuck: false })).toBe(
			"Enviando",
		);
		expect(statusLabelOf({ status: "sending", stuck: true })).toBe(
			"Travada",
		);
	});

	it("labels the remaining statuses in pt-BR", () => {
		expect(statusLabelOf({ status: "sent", stuck: false })).toBe("Enviada");
		expect(statusLabelOf({ status: "skipped", stuck: false })).toBe(
			"Ignorada",
		);
	});
});

describe("errorTextOf", () => {
	it("prefers the stored error, else the localized skip reason", () => {
		expect(errorTextOf(row())).toBe("validation_error: bad address");
		expect(
			errorTextOf(row({ lastError: null, skipReason: "state_changed" })),
		).toBe("skip: Estado mudou antes do envio");
		expect(errorTextOf(row({ lastError: null, skipReason: null }))).toBe(
			"—",
		);
	});
});

describe("buildDiagnostic", () => {
	const text = buildDiagnostic(row());

	it("contains the requested fields in ISO UTC", () => {
		expect(text).toContain("id: 11111111-1111-4111-8111-111111111111");
		expect(text).toContain("tipo: event_registration_confirmation");
		expect(text).toContain("status: Falhou");
		expect(text).toContain("tentativas: 3");
		expect(text).toContain("provedor: resend");
		expect(text).toContain("criado em (UTC): 2026-10-18T12:00:00.000Z");
		expect(text).toContain("atualizado em (UTC): 2026-10-18T12:05:00.000Z");
		expect(text).toContain("erro: validation_error: bad address");
		expect(text).toContain(
			'entityRefs: {"registrationId":"11111111-1111-4111-8111-111111111111"}',
		);
	});

	it("masks the recipient e-mail", () => {
		expect(text).toContain("destinatário: ab***@ic.ufal.br");
		expect(text).not.toContain("abigail@ic.ufal.br");
	});

	it("does not add hidden fields (message id, props hash, subject)", () => {
		const withExtras = buildDiagnostic(
			row({
				providerMessageId: "ses-msg-123",
				propsHash: "f".repeat(64),
				subject: "Assunto interno",
				idempotencyKey: "event_registration_confirmation:secret",
			}),
		);
		expect(withExtras).not.toContain("ses-msg-123");
		expect(withExtras).not.toContain("f".repeat(64));
		expect(withExtras).not.toContain("Assunto interno");
		expect(withExtras).not.toContain(
			"event_registration_confirmation:secret",
		);
	});
});

describe("copyText", () => {
	it("uses the Clipboard API when available", async () => {
		const writeText = vi.fn(async () => {});
		vi.stubGlobal("navigator", { clipboard: { writeText } });

		await expect(copyText("erro completo")).resolves.toBe(true);
		expect(writeText).toHaveBeenCalledWith("erro completo");
	});

	it("falls back to execCommand when the Clipboard API is unavailable", async () => {
		vi.stubGlobal("navigator", { clipboard: undefined });
		const execCommand = vi.fn(() => true);
		document.execCommand = execCommand;

		await expect(copyText("fallback")).resolves.toBe(true);
		expect(execCommand).toHaveBeenCalledWith("copy");
	});

	it("reports failure when neither path works", async () => {
		vi.stubGlobal("navigator", {
			clipboard: {
				writeText: vi.fn(async () => {
					throw new Error("denied");
				}),
			},
		});
		document.execCommand = vi.fn(() => {
			throw new Error("nope");
		});

		await expect(copyText("x")).resolves.toBe(false);
	});
});
