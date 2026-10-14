import { describe, expect, it, vi } from "vitest";

import { classifyResendError, createResendProvider } from "./providers/resend";

import type { EmailMessage, SendResult } from "./types";
import type { Resend } from "resend";

type ResendEmails = Pick<Resend, "emails">;

const MESSAGE: EmailMessage = {
	to: "user@example.com",
	from: "Verific <nao-responder@example.com>",
	subject: "hello",
	html: "<p>hello</p>",
	text: "hello",
	headers: { "X-Verific-Notification-Id": "n-1" },
	idempotencyKey: "key-1",
};

function fakeEmails(
	impl: (payload: unknown, options: unknown) => Promise<unknown>,
): ResendEmails {
	return { emails: { send: vi.fn(impl) } } as unknown as ResendEmails;
}

describe("resend provider", () => {
	it("sends html/text (never react) and forwards the idempotency key", async () => {
		const send = vi.fn(async () => ({
			data: { id: "email_123" },
			error: null,
			headers: null,
		}));
		const provider = createResendProvider({
			apiKey: "re_test",
			client: { emails: { send } } as unknown as ResendEmails,
		});

		const result = await provider.send(MESSAGE);

		expect(result).toEqual({ ok: true, providerMessageId: "email_123" });
		expect(send).toHaveBeenCalledTimes(1);
		const [payload, options] = send.mock.calls[0] as unknown as [
			Record<string, unknown>,
			Record<string, unknown> | undefined,
		];
		expect(payload).toMatchObject({
			from: MESSAGE.from,
			to: MESSAGE.to,
			subject: MESSAGE.subject,
			html: MESSAGE.html,
			text: MESSAGE.text,
		});
		expect(payload).not.toHaveProperty("react");
		expect(options).toEqual({ idempotencyKey: "key-1" });
	});

	it("omits send options when there is no idempotency key", async () => {
		const send = vi.fn(async () => ({
			data: { id: "email_124" },
			error: null,
			headers: null,
		}));
		const provider = createResendProvider({
			apiKey: "re_test",
			client: { emails: { send } } as unknown as ResendEmails,
		});

		await provider.send({ ...MESSAGE, idempotencyKey: undefined });

		const [, options] = send.mock.calls[0] as unknown as [unknown, unknown];
		expect(options).toBeUndefined();
	});

	it("maps api errors through the classifier instead of throwing", async () => {
		const provider = createResendProvider({
			apiKey: "re_test",
			client: fakeEmails(async () => ({
				data: null,
				error: {
					name: "validation_error",
					message: "bad from",
					statusCode: 400,
				},
				headers: null,
			})),
		});

		const result = await provider.send(MESSAGE);

		expect(result).toEqual({
			ok: false,
			retryable: false,
			code: "validation_error",
			message: "bad from",
		});
	});

	it("treats network failures as retryable instead of throwing", async () => {
		const provider = createResendProvider({
			apiKey: "re_test",
			client: fakeEmails(async () => {
				throw new Error("fetch failed");
			}),
		});

		const result = await provider.send(MESSAGE);

		expect(result).toMatchObject({
			ok: false,
			retryable: true,
			code: "resend_transport_error",
		});
	});

	it.each([
		// retryable: rate limits and 5xx
		{
			name: "rate_limit_exceeded",
			status: 429,
			retryable: true,
			code: "rate_limit_exceeded",
		},
		{
			name: "application_error",
			status: 500,
			retryable: true,
			code: "application_error",
		},
		{
			name: "internal_server_error",
			status: 500,
			retryable: true,
			code: "internal_server_error",
		},
		{
			name: "concurrent_idempotent_requests",
			status: 409,
			retryable: true,
			code: "concurrent_idempotent_requests",
		},
		// quota exhaustion is NOT retryable inline
		{
			name: "daily_quota_exceeded",
			status: 429,
			retryable: false,
			code: "provider_quota",
		},
		{
			name: "monthly_quota_exceeded",
			status: 429,
			retryable: false,
			code: "provider_quota",
		},
		// permanent: validation / address / auth
		{
			name: "validation_error",
			status: 400,
			retryable: false,
			code: "validation_error",
		},
		{
			name: "invalid_from_address",
			status: 403,
			retryable: false,
			code: "invalid_from_address",
		},
		{
			name: "missing_required_field",
			status: 422,
			retryable: false,
			code: "missing_required_field",
		},
		{
			name: "invalid_idempotent_request",
			status: 409,
			retryable: false,
			code: "invalid_idempotent_request",
		},
		{
			name: "missing_api_key",
			status: 401,
			retryable: false,
			code: "missing_api_key",
		},
	])(
		"classifies $name ($status) as retryable=$retryable",
		({ name, status, retryable, code }) => {
			const result: SendResult = classifyResendError({
				name,
				message: name,
				statusCode: status,
			});
			expect(result).toMatchObject({ ok: false, retryable, code });
		},
	);
});
