import "server-only";
import { Client } from "@upstash/qstash";

import { env } from "@verific/env";

import { emailUrl } from "../notifications/urls";

import type {
	OfferExpiryScheduler,
	ScheduleOfferExpiryArgs,
	ScheduleOfferExpiryResult,
} from "./index";

const MAX_DELAY_DAYS = 6; // Free plan limit is 7 days; leave 1 day margin
const MAX_DELAY_MS = MAX_DELAY_DAYS * 24 * 60 * 60 * 1000;

/**
 * Production scheduler using Upstash QStash.
 * Publishes to the offer-expiry endpoint with absolute delivery time.
 */
export function createQStashScheduler(): OfferExpiryScheduler {
	const token = env.QSTASH_TOKEN;
	if (!token) {
		throw new Error(
			"QSTASH_TOKEN is not set. Set it or use SCHEDULER_PROVIDER=console.",
		);
	}

	const client = new Client({ token });

	async function getSigningKeys(): Promise<{
		current: string;
		next?: string;
	}> {
		const current = env.QSTASH_CURRENT_SIGNING_KEY;
		const next = env.QSTASH_NEXT_SIGNING_KEY;
		if (!current) {
			throw new Error(
				"QSTASH_CURRENT_SIGNING_KEY is not set. Get it from the Upstash console.",
			);
		}
		return { current, next };
	}

	return {
		async schedule(
			args: ScheduleOfferExpiryArgs,
		): Promise<ScheduleOfferExpiryResult> {
			const now = Date.now();
			const expiresAtMs = new Date(args.expiresAt).getTime();
			let delayMs = expiresAtMs - now;

			// Clamp to free-plan max delay (~6 days)
			if (delayMs > MAX_DELAY_MS) {
				delayMs = MAX_DELAY_MS;
			}
			if (delayMs < 0) delayMs = 0;

			const dedupId = `offer-expiry:${args.enrollmentId}:${args.offeredAt}`;
			const url = emailUrl("/api/jobs/offer-expiry");

			try {
				const res = await client.publishJSON({
					url,
					body: {
						enrollmentId: args.enrollmentId,
						activityId: args.activityId,
						offeredAt: args.offeredAt,
						expiresAt: args.expiresAt,
					},
					notBefore: Math.ceil((now + delayMs) / 1000), // Unix seconds, UTC
					retries: 3,
					deduplicationId: dedupId,
				});
				// @upstash/qstash v2 returns { messageId } on success
				const messageId = (res as { messageId?: string }).messageId;
				return { messageId };
			} catch (err) {
				// Re-throw so caller can catch and log without breaking offer creation
				throw err;
			}
		},
	};
}
