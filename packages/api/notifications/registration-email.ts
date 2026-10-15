import "server-only";
import { env } from "@verific/env";

import { sanitizeLogoUrl } from "./emails/event-registration-confirmation";
import { sendNotification } from "./service";

import type { EventRegistrationConfirmationPayload } from "./emails/event-registration-confirmation";
import type { SendNotificationInput } from "./types";

export interface QueueRegistrationEmailArgs {
	registrationId: string;
	to: string | null | undefined;
	eventId: string;
	participantName: string;
	eventName: string;
	eventUrlPath: string;
	shortId: string;
	startDate: Date;
	endDate: Date;
	eventLocation?: string | null;
	logoUrl?: string | null;
}

const saoPauloDay = new Intl.DateTimeFormat("pt-BR", {
	timeZone: "America/Sao_Paulo",
	day: "2-digit",
	month: "long",
	year: "numeric",
});

const saoPauloTime = new Intl.DateTimeFormat("pt-BR", {
	timeZone: "America/Sao_Paulo",
	hour: "2-digit",
	minute: "2-digit",
});

/**
 * Formats an already-known event range in pt-BR (America/Sao_Paulo, the
 * repo-wide convention for event display). Same-day ranges include the time
 * window; multi-day ranges show both dates.
 */
export function formatEventDateText(startDate: Date, endDate: Date): string {
	const start = new Date(startDate);
	const end = new Date(endDate);
	if (saoPauloDay.format(start) === saoPauloDay.format(end)) {
		return `${saoPauloDay.format(start)}, ${saoPauloTime.format(start)} – ${saoPauloTime.format(end)}`;
	}
	return `${saoPauloDay.format(start)} – ${saoPauloDay.format(end)}`;
}

/**
 * Pure builder so the email input is unit-testable without a database.
 * The access URL points at the participant's profile page (with `?me=1`,
 * the same owner view the app redirects to after subscribing).
 */
export function buildRegistrationEmailInput(
	args: QueueRegistrationEmailArgs,
): SendNotificationInput | null {
	const to = args.to?.trim();
	if (!to) return null;
	const baseUrl = env.NEXT_PUBLIC_VERCEL_URL.replace(/\/$/, "");
	const payload: EventRegistrationConfirmationPayload = {
		participantName: args.participantName,
		eventName: args.eventName,
		eventDateText: formatEventDateText(args.startDate, args.endDate),
		eventLocation: args.eventLocation?.trim() || undefined,
		accessUrl: `${baseUrl}/${args.eventUrlPath}/profile/${args.shortId}?me=1`,
		logoUrl: sanitizeLogoUrl(args.logoUrl ?? undefined),
	};
	return {
		type: "event_registration_confirmation",
		idempotencyKey: `event_registration_confirmation:${args.registrationId}`,
		to,
		eventId: args.eventId,
		payload: payload as unknown as Record<string, unknown>,
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
