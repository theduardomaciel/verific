import "server-only";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { NodeHttpHandler } from "@smithy/node-http-handler";

import type { EmailMessage, EmailProvider, SendResult } from "../types";

export interface SesProviderOptions {
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	/** Injected for tests so no real client is built. */
	client?: Pick<SESv2Client, "send">;
}

type SesClient = Pick<SESv2Client, "send">;

/**
 * Error mapping (sources: SESv2 `SendEmail` API reference
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_SendEmail.html
 * plus the installed `@aws-sdk/client-sesv2` `models/errors.d.ts`, whose
 * class names surface as `err.name` with the HTTP status at
 * `err.$metadata.httpStatusCode`):
 *
 * - retryable: `TooManyRequestsException` (429 throttling),
 *   `LimitExceededException` (rate/quota pressure, 400), and any 5xx
 *   (`InternalServiceErrorException` and friends) — transient, safe to back
 *   off and retry. `ThrottlingException` is included defensively: some SDK
 *   retry paths surface generic throttling under that name.
 * - permanent: `MessageRejected` (invalid content, sandbox/recipient
 *   restrictions, unverified identities), `MailFromDomainNotVerifiedException`
 *   (unverified identity), `SendingPausedException` (account sending paused),
 *   `AccountSuspendedException`, `BadRequestException`/`NotFoundException`
 *   (validation: bad payload, unknown configuration set).
 * - fallback: unknown errors use the HTTP status (429/5xx retryable, other
 *   4xx permanent); errors with no status (timeouts, DNS, refused
 *   connections) are treated as transient and retryable.
 *
 * NOTE: SES `SendEmail` has no idempotency parameter (no `ClientToken` in the
 * API above), so `msg.idempotencyKey` is intentionally NOT forwarded — our
 * notification row owns idempotency.
 */
export function classifySesError(err: unknown): SendResult {
	const rawName = (err as { name?: unknown })?.name;
	// A bare `new Error(...)` reports name "Error", which carries no signal.
	const errorName =
		typeof rawName === "string" && rawName !== "Error" ? rawName : "";
	const metadata = (err as { $metadata?: { httpStatusCode?: unknown } })
		?.$metadata;
	const status =
		typeof metadata?.httpStatusCode === "number"
			? metadata.httpStatusCode
			: undefined;
	const message = err instanceof Error ? err.message : "Unknown SES error.";

	const RETRYABLE_NAMES = new Set([
		"TooManyRequestsException",
		"ThrottlingException",
		"LimitExceededException",
	]);
	const PERMANENT_NAMES = new Set([
		"MessageRejected",
		"MailFromDomainNotVerifiedException",
		"SendingPausedException",
		"AccountSuspendedException",
		"BadRequestException",
		"NotFoundException",
	]);

	if (RETRYABLE_NAMES.has(errorName) || status === 429) {
		return {
			ok: false,
			retryable: true,
			code: toCode(errorName, "ses_throttled"),
			message,
		};
	}
	if (status !== undefined && status >= 500) {
		return {
			ok: false,
			retryable: true,
			code: toCode(errorName, "ses_server_error"),
			message,
		};
	}
	if (PERMANENT_NAMES.has(errorName)) {
		return {
			ok: false,
			retryable: false,
			code: toCode(errorName, "ses_rejected"),
			message,
		};
	}
	if (status !== undefined && status >= 400 && status < 500) {
		return {
			ok: false,
			retryable: false,
			code: toCode(errorName, "ses_client_error"),
			message,
		};
	}
	// No name and no status (network failure, timeout): assume transient.
	return {
		ok: false,
		retryable: true,
		code: toCode(errorName, "ses_transport_error"),
		message,
	};
}

export function createSesProvider(options: SesProviderOptions): EmailProvider {
	let client: SesClient | undefined = options.client;
	return {
		name: "ses",
		async send(msg: EmailMessage): Promise<SendResult> {
			try {
				client ??= new SESv2Client({
					region: options.region,
					credentials: {
						accessKeyId: options.accessKeyId,
						secretAccessKey: options.secretAccessKey,
					},
					// The service owns retries; the SDK must not retry or hide latency.
					maxAttempts: 1,
					requestHandler: new NodeHttpHandler({
						connectionTimeout: 5_000,
						requestTimeout: 10_000,
					}),
				});
				const output = await client.send(
					new SendEmailCommand({
						FromEmailAddress: msg.from,
						Destination: { ToAddresses: [msg.to] },
						Content: {
							Simple: {
								Subject: {
									Data: msg.subject,
									Charset: "UTF-8",
								},
								Body: {
									Html: { Data: msg.html, Charset: "UTF-8" },
									Text: { Data: msg.text, Charset: "UTF-8" },
								},
							},
						},
					}),
				);
				return {
					ok: true,
					providerMessageId: output.MessageId ?? "unknown",
				};
			} catch (err) {
				return classifySesError(err);
			}
		},
	};
}

function toCode(errorName: string, fallback: string): string {
	if (!errorName) return fallback;
	return errorName
		.replace(/Exception$/, "")
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.toLowerCase();
}
