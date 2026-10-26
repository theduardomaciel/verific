import "server-only";
import { scheduleAfterResponse } from "../lib/after-response";
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
		try {
			await sendNotification(input);
		} catch (err) {
			// Refs malformados (InvalidEntityRefsError) ou falha de insert:
			// loga com contexto — o pedido do usuário nunca quebra.
			console.error(
				`[notifications] ${input.type} dispatch failed (registrationId=${args.registrationId}):`,
				err,
			);
		}
	});
}
