import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { lockActivity } from "@verific/api/seats";
import { settleActivity } from "@verific/api/waitlist";
import { db } from "@verific/drizzle";
import { and, eq } from "@verific/drizzle/orm";
import { activityWaitlist } from "@verific/drizzle/schema";
import { env } from "@verific/env";

import { readVerifiedQStashBody } from "@/lib/qstash";

// A delivery up to this early is treated as due (clock skew), not rescheduled
const GRACE_MS = 2 * 60 * 1000;

interface OfferExpiryPayload {
	enrollmentId: string;
	activityId: string;
	offeredAt: string; // ISO string
	expiresAt: string; // ISO string
}

async function verifySignature(
	request: NextRequest,
): Promise<{ valid: boolean; payload: OfferExpiryPayload | null }> {
	const body = await readVerifiedQStashBody(request);
	if (body === null) {
		return { valid: false, payload: null };
	}

	try {
		const payload = JSON.parse(body) as OfferExpiryPayload;
		// Basic validation
		if (
			!payload.enrollmentId ||
			!payload.activityId ||
			!payload.offeredAt ||
			!payload.expiresAt
		) {
			return { valid: false, payload: null };
		}
		return { valid: true, payload };
	} catch {
		return { valid: false, payload: null };
	}
}

export async function POST(request: NextRequest): Promise<NextResponse> {
	// Refuse to run if signing keys are not configured
	if (!env.QSTASH_CURRENT_SIGNING_KEY) {
		console.error(
			"[offer-expiry] Signing keys not configured, refusing to run",
		);
		return NextResponse.json(
			{ error: "Signing keys not configured" },
			{ status: 500 },
		);
	}

	const { valid, payload } = await verifySignature(request);
	if (!valid || !payload) {
		return NextResponse.json(
			{ error: "Invalid signature" },
			{ status: 401 },
		);
	}

	const { enrollmentId, activityId, offeredAt, expiresAt } = payload;
	const now = new Date();
	const expiresAtDate = new Date(expiresAt);
	const offeredAtDate = new Date(offeredAt);

	try {
		// Check current state of the waitlist entry
		const [entry] = await db
			.select({
				id: activityWaitlist.id,
				status: activityWaitlist.status,
				offeredAt: activityWaitlist.offeredAt,
			})
			.from(activityWaitlist)
			.where(
				and(
					eq(activityWaitlist.id, enrollmentId),
					eq(activityWaitlist.activityId, activityId),
				),
			);

		// No-op if entry doesn't exist or is no longer offered
		if (!entry || entry.status !== "offered") {
			return NextResponse.json({
				status: "no-op",
				reason: "not-offered",
			});
		}

		// No-op if offeredAt changed (re-offered)
		if (
			entry.offeredAt &&
			entry.offeredAt.getTime() !== offeredAtDate.getTime()
		) {
			return NextResponse.json({ status: "no-op", reason: "re-offered" });
		}

		// Early fire: if we're clearly before expiry (allow small grace for clock skew)
		const timeUntilExpiry = expiresAtDate.getTime() - now.getTime();
		if (timeUntilExpiry > GRACE_MS) {
			// Re-publish with the remaining delay
			const scheduler = await (
				await import("@verific/api/scheduler")
			).getOfferExpiryScheduler();
			await scheduler.schedule({
				enrollmentId,
				activityId,
				offeredAt,
				expiresAt,
			});
			return NextResponse.json({
				status: "re-scheduled",
				remainingMs: timeUntilExpiry,
			});
		}

		// Due: settle as of the deadline at the latest, so an early delivery
		// still expires this offer and the next person gets offered
		const settleAt = new Date(
			Math.max(now.getTime(), expiresAtDate.getTime()),
		);
		await db.transaction(async (tx) => {
			const locked = await lockActivity(tx, activityId);
			await settleActivity(tx, locked, settleAt);
		});

		return NextResponse.json({ status: "settled" });
	} catch (err) {
		console.error("[offer-expiry] Error processing:", err);
		// Return 5xx so QStash retries
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}

// Increase maxDuration for the route (Vercel Hobby: 30s, Pro: 60s)
export const maxDuration = 30;
