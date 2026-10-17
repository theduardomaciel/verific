import "server-only";
import { getNotificationDefinition } from "./registry";
import { sendNotification } from "./service";

import type { SendNotificationInput } from "./types";

export interface QueueRegistrationEmailArgs {
	/** `participant.id`. The only ref stored; everything else is rebuilt. */
	registrationId: string;
	to: string | null | undefined;
	eventId: string;
}

/**
 * Pure builder so the email input is unit-testable without a database.
 * Display data (name, dates, location, logo, profile URL) is intentionally
 * NOT stored: `event_registration_confirmation` rebuilds all of it from
 * `entityRefs.registrationId` on every attempt.
 */
export function buildRegistrationEmailInput(
	args: QueueRegistrationEmailArgs,
): SendNotificationInput | null {
	const to = args.to?.trim();
	if (!to) return null;
	const definition = getNotificationDefinition(
		"event_registration_confirmation",
	);
	if (!definition) {
		throw new Error(
			"[notifications] event_registration_confirmation missing from the registry.",
		);
	}
	const entityRefs = { registrationId: args.registrationId };
	return {
		type: "event_registration_confirmation",
		idempotencyKey: definition.buildIdempotencyKey(entityRefs),
		to,
		eventId: args.eventId,
		entityRefs,
	};
}

/**
 * Runs work after the response when a Next.js runtime is available
 * (`after()` keeps serverless work from being cut off); otherwise awaits it
 * inline. Never throws and never lets background failures surface.
 */
export async function scheduleAfterResponse(
	work: () => Promise<void>,
): Promise<void> {
	let scheduled = false;
	try {
		const { after } = await import("next/server");
		if (typeof after === "function") {
			after(() => {
				work().catch((err: unknown) => {
					console.error(
						"[notifications] background email failed:",
						err instanceof Error ? err.message : String(err),
					);
				});
			});
			scheduled = true;
		}
	} catch {
		// No Next runtime (tests, scripts): fall through to inline below.
	}
	if (!scheduled) {
		try {
			await work();
		} catch (err) {
			console.error(
				"[notifications] background email failed:",
				err instanceof Error ? err.message : String(err),
			);
		}
	}
}

/**
 * Queues the main-event registration confirmation. Fire-and-forget: returns
 * immediately and can never fail or roll back the registration — every
 * failure (including validation and provider errors) is recorded on the
 * notification row by `sendNotification` instead.
 */
export function queueEventRegistrationEmail(
	args: QueueRegistrationEmailArgs,
): void {
	void scheduleAfterResponse(async () => {
		const input = buildRegistrationEmailInput(args);
		if (!input) return;
		await sendNotification(input);
	});
}
