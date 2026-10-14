import { describe, expect, it, vi } from "vitest";

import { classifySesError, createSesProvider } from "./providers/ses";

import type { EmailMessage, SendResult } from "./types";
import type { SESv2Client } from "@aws-sdk/client-sesv2";

type SesSend = Pick<SESv2Client, "send">;

const MESSAGE: EmailMessage = {
	to: "user@example.com",
	from: "Verific <nao-responder@example.com>",
	subject: "hello",
	html: "<p>hello</p>",
	text: "hello",
	idempotencyKey: "key-1",
};

function sesError(
	name: string,
	httpStatusCode?: number,
	message = name,
): Error & {
	$metadata: { httpStatusCode?: number };
} {
	const err = new Error(message) as Error & {
		$metadata: { httpStatusCode?: number };
	};
	err.name = name;
	err.$metadata = { httpStatusCode };
	return err;
}

function fakeClient(
	impl: (command: unknown) => Promise<{ MessageId?: string }>,
): SesSend {
	return { send: vi.fn(impl) } as unknown as SesSend;
}

describe("ses provider", () => {
	it("sends a Simple message and returns the MessageId", async () => {
		const send = vi.fn(async () => ({ MessageId: "ses-msg-1" }));
		const provider = createSesProvider({
			region: "us-east-1",
			accessKeyId: "akid",
			secretAccessKey: "secret",
			client: { send } as unknown as SesSend,
		});

		const result = await provider.send(MESSAGE);

		expect(result).toEqual({ ok: true, providerMessageId: "ses-msg-1" });
		expect(send).toHaveBeenCalledTimes(1);
		const [command] = send.mock.calls[0] as unknown as [
			{ input: Record<string, unknown> },
		];
		expect(command.input["FromEmailAddress"]).toBe(MESSAGE.from);
		expect(command.input["Destination"]).toEqual({
			ToAddresses: [MESSAGE.to],
		});
		const simple = (
			command.input["Content"] as { Simple: Record<string, unknown> }
		).Simple;
		expect(simple["Subject"]).toMatchObject({ Data: MESSAGE.subject });
		expect(simple["Body"]).toMatchObject({
			Html: { Data: MESSAGE.html, Charset: "UTF-8" },
			Text: { Data: MESSAGE.text, Charset: "UTF-8" },
		});
	});

	it("maps sdk failures through the classifier instead of throwing", async () => {
		const provider = createSesProvider({
			region: "us-east-1",
			accessKeyId: "akid",
			secretAccessKey: "secret",
			client: fakeClient(async () => {
				throw sesError("MessageRejected", 400, "sandbox recipient");
			}),
		});

		const result = await provider.send(MESSAGE);

		expect(result).toEqual({
			ok: false,
			retryable: false,
			code: "message_rejected",
			message: "sandbox recipient",
		});
	});

	it.each([
		// retryable: throttling / limit pressure / 5xx
		{
			name: "TooManyRequestsException",
			status: 429,
			retryable: true,
			code: "too_many_requests",
		},
		{
			name: "ThrottlingException",
			status: 400,
			retryable: true,
			code: "throttling",
		},
		{
			name: "LimitExceededException",
			status: 400,
			retryable: true,
			code: "limit_exceeded",
		},
		{
			name: "InternalServiceErrorException",
			status: 500,
			retryable: true,
			code: "internal_service_error",
		},
		{
			name: "InternalError",
			status: 503,
			retryable: true,
			code: "internal_error",
		},
		// permanent: rejected / unverified / paused / validation
		{
			name: "MessageRejected",
			status: 400,
			retryable: false,
			code: "message_rejected",
		},
		{
			name: "MailFromDomainNotVerifiedException",
			status: 400,
			retryable: false,
			code: "mail_from_domain_not_verified",
		},
		{
			name: "SendingPausedException",
			status: 400,
			retryable: false,
			code: "sending_paused",
		},
		{
			name: "AccountSuspendedException",
			status: 400,
			retryable: false,
			code: "account_suspended",
		},
		{
			name: "BadRequestException",
			status: 400,
			retryable: false,
			code: "bad_request",
		},
		{
			name: "NotFoundException",
			status: 404,
			retryable: false,
			code: "not_found",
		},
		{ name: "Unknown", status: 400, retryable: false, code: "unknown" },
		// transport failure without name/status: assume transient
		{
			name: "",
			status: undefined,
			retryable: true,
			code: "ses_transport_error",
		},
	])(
		"classifies $name ($status) as retryable=$retryable",
		({ name, status, retryable, code }) => {
			const err =
				name === "" && status === undefined
					? new Error("socket hang up")
					: sesError(name, status);
			const result: SendResult = classifySesError(err);
			expect(result).toMatchObject({ ok: false, retryable, code });
		},
	);
});
