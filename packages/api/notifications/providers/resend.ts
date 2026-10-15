import "server-only";
import { Resend } from "resend";

import type { EmailMessage, EmailProvider, SendResult } from "../types";

export interface ResendProviderOptions {
	apiKey: string;
	/** Injected for tests so no real client is built. */
	client?: Pick<Resend, "emails">;
}

interface ResendFailure {
	name?: string;
	message?: string;
	statusCode?: number | null;
}

/**
 * Error mapping (sources: Resend errors reference
 * https://resend.com/docs/api-reference/errors — `name` values below are the
 * SDK's `error.name` — plus the installed `resend` package
 * `RESEND_ERROR_CODE_KEY` type):
 *
 * - retryable: `rate_limit_exceeded` (429) and any 429/5xx
 *   (`application_error`, `internal_server_error`, `service_unavailable`) —
 *   transient, safe to back off and retry. `concurrent_idempotent_requests`
 *   (409) is also retryable: another request with the same key is in flight,
 *   retrying later is the documented action.
 * - NOT retryable inline: `daily_quota_exceeded` / `monthly_quota_exceeded`
 *   (429) → code `provider_quota`, which the service maps to status
 *   `blocked_quota` instead of `failed` and does not retry.
 * - permanent: `validation_error`, `missing_required_field`,
 *   `invalid_parameter`, `invalid_attachment`, `invalid_from_address`,
 *   `not_found`, `method_not_allowed`, `invalid_idempotent_request`,
 *   auth errors (`missing_api_key`, `invalid_api_key`, `restricted_api_key`).
 * - the SDK returns `{ data, error }` instead of throwing, but network
 *   failures still throw — those are caught and treated as transient.
 *
 * Idempotency: the Node SDK accepts `{ idempotencyKey }` as the second
 * `send()` argument (sent as the `Idempotency-Key` header, kept 24h), so
 * `msg.idempotencyKey` IS forwarded. We never use the `react:` option —
 * only the html/text we render ourselves.
 */
export function classifyResendError(error: ResendFailure): SendResult {
	const name = error.name ?? "";
	const status = error.statusCode ?? undefined;
	const message = error.message ?? "Unknown Resend error.";

	if (name === "daily_quota_exceeded" || name === "monthly_quota_exceeded") {
		return { ok: false, retryable: false, code: "provider_quota", message };
	}
	if (
		name === "rate_limit_exceeded" ||
		name === "concurrent_idempotent_requests" ||
		status === 429 ||
		(status !== undefined && status >= 500)
	) {
		return {
			ok: false,
			retryable: true,
			code: name || "resend_server_error",
			message,
		};
	}
	return {
		ok: false,
		retryable: false,
		code: name || "resend_error",
		message,
	};
}

export function createResendProvider(
	options: ResendProviderOptions,
): EmailProvider {
	let client: Pick<Resend, "emails"> | undefined = options.client;
	return {
		name: "resend",
		async send(msg: EmailMessage): Promise<SendResult> {
			try {
				client ??= new Resend(options.apiKey);
				const { data, error } = await client.emails.send(
					{
						from: msg.from,
						to: msg.to,
						subject: msg.subject,
						html: msg.html,
						text: msg.text,
						headers: msg.headers,
					},
					msg.idempotencyKey
						? { idempotencyKey: msg.idempotencyKey }
						: undefined,
				);
				if (error) {
					return classifyResendError({
						name: error.name,
						message: error.message,
						statusCode: error.statusCode,
					});
				}
				return { ok: true, providerMessageId: data?.id ?? "unknown" };
			} catch (err) {
				const message =
					err instanceof Error
						? err.message
						: "Unknown Resend error.";
				return {
					ok: false,
					retryable: true,
					code: "resend_transport_error",
					message,
				};
			}
		},
	};
}
