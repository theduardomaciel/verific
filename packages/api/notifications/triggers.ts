import "server-only";
import { db } from "@verific/drizzle";
import { and, eq, inArray } from "@verific/drizzle/orm";
import {
	activityWaitlist,
	participant,
	participantOnActivity,
	user,
} from "@verific/drizzle/schema";

import { scheduleAfterResponse } from "./registration-email";
import { createBuildContext, getNotificationDefinition } from "./registry";
import {
	enqueueNotifications,
	processQueuedNotifications,
	sendNotification,
} from "./service";

import type { EntityRefs, SendNotificationInput } from "./types";

/**
 * Trigger layer for the notification types that are reactions to state
 * changes. Every function here is called AFTER the transaction that changed
 * the state committed (routers call them fire-and-forget): a rolled-back
 * mutation never produces an e-mail. The functions never throw — failures
 * are recorded on the notification row (single send) or logged (bulk).
 */

/** Lower runs first inside one batch. */
const TYPE_PRIORITY: Record<string, number> = {
	activity_waitlist_promoted: 0,
	activity_enrollment_removed: 0,
	activity_enrollment_cancelled: 0,
	activity_cancelled: 0,
	event_registration_removed: 0,
	activity_enrollment_confirmed: 1,
	activity_waitlisted: 1,
	activity_waitlist_offered: 1,
	activity_updated: 2,
};

function priorityOf(type: string): number {
	return TYPE_PRIORITY[type] ?? 3;
}

/**
 * Sends a trigger batch: a single e-mail goes straight through
 * `sendNotification` (existing quota semantics); a batch is enqueued in one
 * round trip and sent by the bounded loop, in priority order, leaving
 * leftovers `pending` for reprocessing when the daily cap is reached.
 */
export async function dispatchNotifications(
	inputs: SendNotificationInput[],
): Promise<void> {
	if (inputs.length === 0) return;
	const ordered = [...inputs].sort(
		(a, b) => priorityOf(a.type) - priorityOf(b.type),
	);
	// One cache per batch: activity/event rows are loaded once for every
	// e-mail of the same activity.
	const shared = createBuildContext();
	if (ordered.length === 1) {
		await sendNotification(ordered[0]!, { shared });
		return;
	}
	const enqueued = await enqueueNotifications(ordered);
	const ids = enqueued
		.map((result) => result.notification?.id)
		.filter((id): id is string => Boolean(id));
	await processQueuedNotifications(ids, { shared });
}

function dispatchAfterResponse(inputs: SendNotificationInput[]): Promise<void> {
	if (inputs.length === 0) return Promise.resolve();
	return scheduleAfterResponse(() => dispatchNotifications(inputs));
}

/**
 * Builds one input from refs. Returns null (and logs) when a required ref is
 * missing — a malformed trigger must never take down the mutation.
 */
function makeInput(args: {
	type: SendNotificationInput["type"];
	eventId: string;
	to: string;
	entityRefs: EntityRefs;
}): SendNotificationInput | null {
	const definition = getNotificationDefinition(args.type);
	if (!definition) return null;
	try {
		return {
			type: args.type,
			idempotencyKey: definition.buildIdempotencyKey(args.entityRefs),
			to: args.to,
			eventId: args.eventId,
			entityRefs: args.entityRefs,
		};
	} catch (err) {
		console.error(
			`[notifications] ${args.type} trigger skipped:`,
			err instanceof Error ? err.message : String(err),
		);
		return null;
	}
}

/* ------------------------------------------------------------------ */
/* Audience loading (one query per concern)                            */
/* ------------------------------------------------------------------ */

/** participantId → email, for the ids that have a usable address. */
export async function loadNotificationRecipients(
	participantIds: string[],
): Promise<Map<string, string>> {
	const ids = [...new Set(participantIds)];
	if (ids.length === 0) return new Map();
	const rows = await db
		.select({ id: participant.id, email: user.email })
		.from(participant)
		.innerJoin(user, eq(user.id, participant.userId))
		.where(inArray(participant.id, ids));
	const contacts = new Map<string, string>();
	for (const row of rows) {
		const email = row.email?.trim();
		if (email) contacts.set(row.id, email);
	}
	return contacts;
}

/** Inscritos (role `participant`) + fila ativa, sem repetição. */
export async function loadActivityAudience(
	activityId: string,
): Promise<string[]> {
	const [enrolled, queued] = await Promise.all([
		db
			.selectDistinct({
				participantId: participantOnActivity.participantId,
			})
			.from(participantOnActivity)
			.where(
				and(
					eq(participantOnActivity.activityId, activityId),
					eq(participantOnActivity.role, "participant"),
				),
			),
		db
			.selectDistinct({ participantId: activityWaitlist.participantId })
			.from(activityWaitlist)
			.where(
				and(
					eq(activityWaitlist.activityId, activityId),
					inArray(activityWaitlist.status, ["waiting", "offered"]),
				),
			),
	]);
	return [
		...new Set([
			...enrolled.map((row) => row.participantId),
			...queued.map((row) => row.participantId),
		]),
	];
}

/** Só inscritos (role `participant`). */
export async function loadEnrolledAudience(
	activityId: string,
): Promise<string[]> {
	const rows = await db
		.selectDistinct({ participantId: participantOnActivity.participantId })
		.from(participantOnActivity)
		.where(
			and(
				eq(participantOnActivity.activityId, activityId),
				eq(participantOnActivity.role, "participant"),
			),
		);
	return rows.map((row) => row.participantId);
}

/* ------------------------------------------------------------------ */
/* Event-level triggers                                                */
/* ------------------------------------------------------------------ */

/** Organizer removed a registration (recipient captured before the delete). */
export function notifyEventRegistrationRemoved(args: {
	eventId: string;
	registrationId: string;
	to: string;
	reason?: string;
}): Promise<void> {
	const input = makeInput({
		type: "event_registration_removed",
		eventId: args.eventId,
		to: args.to,
		entityRefs: {
			registrationId: args.registrationId,
			...(args.reason ? { reason: args.reason } : {}),
		},
	});
	return dispatchAfterResponse(input ? [input] : []);
}

/* ------------------------------------------------------------------ */
/* Activity triggers                                                   */
/* ------------------------------------------------------------------ */

/** Newly enrolled participants (never who was already enrolled). */
export function notifyActivityEnrollmentConfirmed(args: {
	eventId: string;
	activityId: string;
	contacts: Map<string, string>;
	enrolled: Array<{ participantId: string; subscribedAt: Date }>;
}): Promise<void> {
	const inputs = args.enrolled.flatMap((entry) => {
		const to = args.contacts.get(entry.participantId);
		if (!to) return [];
		const input = makeInput({
			type: "activity_enrollment_confirmed",
			eventId: args.eventId,
			to,
			entityRefs: {
				activityId: args.activityId,
				participantId: entry.participantId,
				subscribedAt: entry.subscribedAt.toISOString(),
			},
		});
		return input ? [input] : [];
	});
	return dispatchAfterResponse(inputs);
}

/** A confirmable waitlist entry was created for one participant. */
export function notifyActivityWaitlisted(args: {
	eventId: string;
	activityId: string;
	participantId: string;
	to: string;
	enrollmentId: string;
	position?: number;
}): Promise<void> {
	const input = makeInput({
		type: "activity_waitlisted",
		eventId: args.eventId,
		to: args.to,
		entityRefs: {
			activityId: args.activityId,
			participantId: args.participantId,
			enrollmentId: args.enrollmentId,
			...(args.position ? { position: args.position } : {}),
		},
	});
	return dispatchAfterResponse(input ? [input] : []);
}

/**
 * Waitlist entries that were just offered a spot. Recipients are loaded inside
 * the deferred work (after the response), so no query runs in the caller's
 * transaction; a rolled-back settlement is later skipped by `validate`.
 */
export function notifyActivityWaitlistOffered(args: {
	eventId: string;
	activityId: string;
	offers: Array<{
		participantId: string;
		enrollmentId: string;
		offeredAt: Date;
		expiresAt: Date;
	}>;
}): Promise<void> {
	if (args.offers.length === 0) return Promise.resolve();
	return scheduleAfterResponse(async () => {
		const contacts = await loadNotificationRecipients(
			args.offers.map((offer) => offer.participantId),
		);
		const inputs = args.offers.flatMap((offer) => {
			const to = contacts.get(offer.participantId);
			if (!to) return [];
			const input = makeInput({
				type: "activity_waitlist_offered",
				eventId: args.eventId,
				to,
				entityRefs: {
					activityId: args.activityId,
					participantId: offer.participantId,
					enrollmentId: offer.enrollmentId,
					offeredAt: offer.offeredAt.toISOString(),
					offerExpiresAt: offer.expiresAt.toISOString(),
				},
			});
			return input ? [input] : [];
		});
		await dispatchNotifications(inputs);
	});
}

/** Only the entries actually flipped to `enrolled` by the transaction. */
export function notifyActivityWaitlistPromoted(args: {
	eventId: string;
	activityId: string;
	contacts: Map<string, string>;
	resolved: Array<{
		id: string;
		participantId: string;
		resolvedAt: Date;
	}>;
}): Promise<void> {
	const inputs = args.resolved.flatMap((entry) => {
		const to = args.contacts.get(entry.participantId);
		if (!to) return [];
		const input = makeInput({
			type: "activity_waitlist_promoted",
			eventId: args.eventId,
			to,
			entityRefs: {
				activityId: args.activityId,
				participantId: entry.participantId,
				enrollmentId: entry.id,
				promotedAt: entry.resolvedAt.toISOString(),
			},
		});
		return input ? [input] : [];
	});
	return dispatchAfterResponse(inputs);
}

/** The participant cancelled their own enrollment. */
export function notifyActivityEnrollmentCancelled(args: {
	eventId: string;
	activityId: string;
	participantId: string;
	to: string;
	cancelledAt: Date;
}): Promise<void> {
	const input = makeInput({
		type: "activity_enrollment_cancelled",
		eventId: args.eventId,
		to: args.to,
		entityRefs: {
			activityId: args.activityId,
			participantId: args.participantId,
			cancelledAt: args.cancelledAt.toISOString(),
		},
	});
	return dispatchAfterResponse(input ? [input] : []);
}

/** An organizer removed the participant from the activity. */
export function notifyActivityEnrollmentRemoved(args: {
	eventId: string;
	activityId: string;
	participantId: string;
	to: string;
	removedAt: Date;
	reason?: string;
}): Promise<void> {
	const input = makeInput({
		type: "activity_enrollment_removed",
		eventId: args.eventId,
		to: args.to,
		entityRefs: {
			activityId: args.activityId,
			participantId: args.participantId,
			removedAt: args.removedAt.toISOString(),
			...(args.reason ? { reason: args.reason } : {}),
		},
	});
	return dispatchAfterResponse(input ? [input] : []);
}

/** A user was added as a contributor (moderator) of a project. */
export function notifyProjectContributorAdded(args: {
	projectId: string;
	contributorUserId: string;
	to: string;
	addedByUserId?: string;
}): Promise<void> {
	const input = makeInput({
		type: "project_contributor_added",
		eventId: args.projectId,
		to: args.to,
		entityRefs: {
			projectId: args.projectId,
			contributorUserId: args.contributorUserId,
			...(args.addedByUserId
				? { addedByUserId: args.addedByUserId }
				: {}),
		},
	});
	return dispatchAfterResponse(input ? [input] : []);
}

/** A contributor's access to a project was removed. */
export function notifyProjectContributorRemoved(args: {
	projectId: string;
	projectName: string;
	contributorUserId: string;
	contributorName?: string | null;
	to: string;
	removedByName?: string;
	reason?: string;
}): Promise<void> {
	const input = makeInput({
		type: "project_contributor_removed",
		eventId: args.projectId,
		to: args.to,
		entityRefs: {
			projectId: args.projectId,
			contributorUserId: args.contributorUserId,
			projectName: args.projectName,
			recipientName: args.contributorName?.trim() || "contribuidor",
			...(args.removedByName
				? { removedByName: args.removedByName }
				: {}),
			...(args.reason ? { reason: args.reason } : {}),
		},
	});
	return dispatchAfterResponse(input ? [input] : []);
}

/** A project was deleted: notify its former contributors. */
export function notifyProjectDeleted(args: {
	projectId: string;
	projectName: string;
	contributors: Array<{
		userId: string;
		name?: string | null;
		email: string;
	}>;
	deletedByName?: string;
	reason?: string;
}): Promise<void> {
	const inputs = args.contributors.flatMap((contributor) => {
		const to = contributor.email?.trim();
		if (!to) return [];
		const input = makeInput({
			type: "project_deleted",
			eventId: args.projectId,
			to,
			entityRefs: {
				projectId: args.projectId,
				contributorUserId: contributor.userId,
				projectName: args.projectName,
				recipientName: contributor.name?.trim() || "contribuidor",
				...(args.deletedByName
					? { deletedByName: args.deletedByName }
					: {}),
				...(args.reason ? { reason: args.reason } : {}),
			},
		});
		return input ? [input] : [];
	});
	return dispatchAfterResponse(inputs);
}

/** Date/time/location change, sent to everyone currently enrolled. */
export async function notifyActivityUpdated(args: {
	eventId: string;
	activityId: string;
	changedAt: Date;
	changeSummary?: string;
}): Promise<void> {
	const ids = await loadEnrolledAudience(args.activityId);
	const contacts = await loadNotificationRecipients(ids);
	const inputs = [...contacts.entries()].flatMap(([participantId, to]) => {
		const input = makeInput({
			type: "activity_updated",
			eventId: args.eventId,
			to,
			entityRefs: {
				activityId: args.activityId,
				participantId,
				changedAt: args.changedAt.toISOString(),
				...(args.changeSummary
					? { changeSummary: args.changeSummary }
					: {}),
			},
		});
		return input ? [input] : [];
	});
	return dispatchAfterResponse(inputs);
}

/**
 * Soft cancellation. The audience must be captured BEFORE the transaction
 * closes the active waitlist entries (waitlisted people also get the e-mail).
 */
export async function notifyActivityCancelled(args: {
	eventId: string;
	activityId: string;
	participantIds: string[];
	reason?: string;
}): Promise<void> {
	const contacts = await loadNotificationRecipients(args.participantIds);
	const inputs = [...contacts.entries()].flatMap(([participantId, to]) => {
		const input = makeInput({
			type: "activity_cancelled",
			eventId: args.eventId,
			to,
			entityRefs: {
				activityId: args.activityId,
				participantId,
				...(args.reason ? { reason: args.reason } : {}),
			},
		});
		return input ? [input] : [];
	});
	return dispatchAfterResponse(inputs);
}
