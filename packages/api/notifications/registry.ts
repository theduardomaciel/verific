import "server-only";
import { createHash } from "node:crypto";

import { db } from "@verific/drizzle";
import { and, eq } from "@verific/drizzle/orm";
import {
	activity,
	activitySession,
	activityWaitlist,
	participant,
	participantOnActivity,
	project,
	user,
} from "@verific/drizzle/schema";

import {
	EVENT_REGISTRATION_CONFIRMATION_VERSION,
	eventRegistrationConfirmationSubject,
	renderEventRegistrationConfirmation,
} from "./emails/event-registration-confirmation";
import { sanitizeLogoUrl } from "./emails/layout";
import {
	EMAIL_QUOTA_WARNING_VERSION,
	emailQuotaWarningSubject,
	renderEmailQuotaWarning,
} from "./emails/organizer-emails";
import {
	ACTIVITY_CANCELLED_VERSION,
	ACTIVITY_ENROLLMENT_CANCELLED_VERSION,
	ACTIVITY_ENROLLMENT_CONFIRMED_VERSION,
	ACTIVITY_ENROLLMENT_REMOVED_VERSION,
	ACTIVITY_UPDATED_VERSION,
	ACTIVITY_WAITLIST_PROMOTED_VERSION,
	ACTIVITY_WAITLISTED_VERSION,
	activityCancelledSubject,
	activityEnrollmentCancelledSubject,
	activityEnrollmentConfirmedSubject,
	activityEnrollmentRemovedSubject,
	activityUpdatedSubject,
	activityWaitlistPromotedSubject,
	activityWaitlistedSubject,
	renderActivityCancelled,
	renderActivityEnrollmentCancelled,
	renderActivityEnrollmentConfirmed,
	renderActivityEnrollmentRemoved,
	renderActivityUpdated,
	renderActivityWaitlistPromoted,
	renderActivityWaitlisted,
	EVENT_REGISTRATION_REMOVED_VERSION,
	eventRegistrationRemovedSubject,
	renderEventRegistrationRemoved,
} from "./emails/participant-emails";
import { formatActivitySessionsText, formatEventDateText } from "./format";
import { activityUrl, adminEmailsUrl, eventUrl, profileUrl } from "./urls";

import type { RenderedTemplate } from "./templates";
import type { EntityRefs, NotificationType, SkipReason } from "./types";

export type NotificationAudience = "participant" | "organizer";
export type NotificationCategory = "transactional" | "optional";
export type NotificationScope = "event" | "activity";

export type ValidationResult = { ok: true } | { ok: false; reason: SkipReason };

/** Per-batch cache so bulk sends do not reload activity/event per row. */
export interface SharedProject {
	id: string;
	name: string;
	url: string;
	address: string | null;
	startDate: Date;
	endDate: Date;
	largeLogoDarkUrl: string | null;
	ownerId: string;
}

export interface SharedActivity {
	id: string;
	name: string;
	address: string | null;
	cancelledAt: Date | null;
	project: SharedProject;
	sessions: Array<{
		startsAt: Date;
		endsAt: Date;
		address: string | null;
	}>;
}

export interface BuildContext {
	activities: Map<string, SharedActivity>;
	projects: Map<string, SharedProject>;
}

export function createBuildContext(): BuildContext {
	return { activities: new Map(), projects: new Map() };
}

export interface NotificationTypeDefinition {
	key: NotificationType;
	audience: NotificationAudience;
	category: NotificationCategory;
	/** Event-level types appear in the "evento" group of the settings UI. */
	scope: NotificationScope;
	defaultEnabled: boolean;
	/** pt-BR description shown in the per-event settings toggles. */
	description: string;
	/** Refs this type reads; documented in the settings/admin surfaces. */
	entityRefs: readonly string[];
	/** Human-readable idempotency key format (documentation + tests). */
	idempotencyKeyFormat: string;
	buildIdempotencyKey(refs: EntityRefs): string;
	validate(refs: EntityRefs): Promise<ValidationResult>;
	buildProps(
		refs: EntityRefs,
		ctx?: BuildContext,
	): Promise<Record<string, unknown>>;
	subject(props: Record<string, unknown>): string;
	render(props: Record<string, unknown>): Promise<RenderedTemplate>;
	/** Current template version written to the notification row. */
	templateVersion: string;
	/** Sample props for the dev preview script and registry tests. */
	previewProps: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Ref helpers                                                         */
/* ------------------------------------------------------------------ */

function requiredString(refs: EntityRefs, key: string): string {
	const value = refs[key];
	if (typeof value !== "string" || value.trim() === "") {
		throw new Error(
			`[notifications] missing required entityRef "${key}" (got ${String(value)}).`,
		);
	}
	return value;
}

function optionalString(refs: EntityRefs, key: string): string | undefined {
	const value = refs[key];
	return typeof value === "string" && value.trim() !== ""
		? value.trim()
		: undefined;
}

function optionalNumber(refs: EntityRefs, key: string): number | undefined {
	const value = refs[key];
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
}

/** Stable JSON (sorted keys) for hashing props without storing them. */
export function stableStringify(value: unknown): string {
	if (value === null || typeof value !== "object")
		return JSON.stringify(value);
	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item)).join(",")}]`;
	}
	const entries = Object.entries(value as Record<string, unknown>)
		.filter(([, v]) => v !== undefined)
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
	return `{${entries
		.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
		.join(",")}}`;
}

/** sha256 of the props used in an attempt. Audit only; props are not stored. */
export function hashProps(props: Record<string, unknown>): string {
	return createHash("sha256").update(stableStringify(props)).digest("hex");
}

/**
 * Email-safe logo prop from the project's dark wide logo. Sanitized here so
 * the WebP warning surfaces in the send path (the layout sanitizes again as
 * a safety net; when the logo is unusable, the header falls back to text).
 */
function logoRef(
	logoUrl: string | null | undefined,
	eventId?: string,
): { logoUrl?: string } {
	const trimmed = logoUrl?.trim();
	if (!trimmed) return {};
	const sanitized = sanitizeLogoUrl(trimmed);
	if (!sanitized) {
		if (/\.webp([?#]|$)/i.test(trimmed)) {
			console.warn(
				`[notifications] logo horizontal escuro é WebP e não pode ir no e-mail; reenvie como PNG${eventId ? ` (evento ${eventId})` : ""}.`,
			);
		}
		return {};
	}
	return { logoUrl: sanitized };
}

/* ------------------------------------------------------------------ */
/* Shared loaders                                                      */
/* ------------------------------------------------------------------ */

function projectToShared(row: {
	id: string;
	name: string;
	url: string;
	address: string | null;
	startDate: Date;
	endDate: Date;
	largeLogoDarkUrl: string | null;
	ownerId: string;
}): SharedProject {
	return {
		id: row.id,
		name: row.name,
		url: row.url,
		address: row.address,
		startDate: row.startDate,
		endDate: row.endDate,
		largeLogoDarkUrl: row.largeLogoDarkUrl,
		ownerId: row.ownerId,
	};
}

/** Loads activity + project + sessions in ONE query (neon-http round trip). */
export async function loadSharedActivity(
	activityId: string,
	ctx?: BuildContext,
): Promise<SharedActivity | null> {
	const cached = ctx?.activities.get(activityId);
	if (cached) return cached;
	const rows = await db
		.select({
			id: activity.id,
			name: activity.name,
			address: activity.address,
			cancelledAt: activity.cancelledAt,
			projectId: project.id,
			projectName: project.name,
			projectUrl: project.url,
			projectAddress: project.address,
			projectStartDate: project.startDate,
			projectEndDate: project.endDate,
			projectLogoDarkUrl: project.largeLogoDarkUrl,
			projectOwnerId: project.ownerId,
			sessionStartsAt: activitySession.startsAt,
			sessionEndsAt: activitySession.endsAt,
			sessionAddress: activitySession.address,
		})
		.from(activity)
		.innerJoin(project, eq(project.id, activity.projectId))
		.leftJoin(activitySession, eq(activitySession.activityId, activity.id))
		.where(eq(activity.id, activityId));
	const first = rows[0];
	if (!first) return null;
	const shared: SharedActivity = {
		id: first.id,
		name: first.name,
		address: first.address,
		cancelledAt: first.cancelledAt,
		project: projectToShared({
			id: first.projectId,
			name: first.projectName,
			url: first.projectUrl,
			address: first.projectAddress,
			startDate: first.projectStartDate,
			endDate: first.projectEndDate,
			largeLogoDarkUrl: first.projectLogoDarkUrl,
			ownerId: first.projectOwnerId,
		}),
		sessions: rows
			.filter((row) => row.sessionStartsAt && row.sessionEndsAt)
			.map((row) => ({
				startsAt: row.sessionStartsAt!,
				endsAt: row.sessionEndsAt!,
				address: row.sessionAddress,
			})),
	};
	ctx?.activities.set(activityId, shared);
	return shared;
}

async function getSharedActivity(
	activityId: string,
	ctx?: BuildContext,
): Promise<SharedActivity | null> {
	return loadSharedActivity(activityId, ctx);
}

/** Participant + event display data in ONE query. */
async function loadParticipantEvent(
	participantId: string,
	ctx?: BuildContext,
): Promise<{
	participantName: string;
	shortId: string;
	project: SharedProject;
} | null> {
	const rows = await db
		.select({
			participantName: user.name,
			shortId: participant.shortId,
			projectId: project.id,
			projectName: project.name,
			projectUrl: project.url,
			projectAddress: project.address,
			projectStartDate: project.startDate,
			projectEndDate: project.endDate,
			projectLogoDarkUrl: project.largeLogoDarkUrl,
			projectOwnerId: project.ownerId,
		})
		.from(participant)
		.innerJoin(user, eq(user.id, participant.userId))
		.innerJoin(project, eq(project.id, participant.projectId))
		.where(eq(participant.id, participantId));
	const row = rows[0];
	if (!row) return null;
	const shared = ctx?.projects.get(row.projectId);
	return {
		participantName: row.participantName,
		shortId: row.shortId,
		project:
			shared ??
			projectToShared({
				id: row.projectId,
				name: row.projectName,
				url: row.projectUrl,
				address: row.projectAddress,
				startDate: row.projectStartDate,
				endDate: row.projectEndDate,
				largeLogoDarkUrl: row.projectLogoDarkUrl,
				ownerId: row.projectOwnerId,
			}),
	};
}

/**
 * Builds activity e-mail props. With a preloaded `ctx.activity` this queries
 * only the per-participant row; otherwise it is a single joined query.
 */
async function buildActivityProps(
	refs: EntityRefs,
	ctx?: BuildContext,
): Promise<Record<string, unknown>> {
	const activityId = requiredString(refs, "activityId");
	const participantId = requiredString(refs, "participantId");

	if (ctx?.activities.has(activityId)) {
		const perParticipant = await loadParticipantEvent(participantId, ctx);
		if (!perParticipant) {
			throw new Error(
				`[notifications] participant ${participantId} not found.`,
			);
		}
		const shared = ctx.activities.get(activityId)!;
		return assembleActivityProps(refs, perParticipant, shared);
	}

	const rows = await db
		.select({
			participantName: user.name,
			projectName: project.name,
			projectUrl: project.url,
			projectAddress: project.address,
			projectLogoDarkUrl: project.largeLogoDarkUrl,
			projectId: project.id,
			projectStartDate: project.startDate,
			projectEndDate: project.endDate,
			projectOwnerId: project.ownerId,
			activityName: activity.name,
			activityAddress: activity.address,
			activityCancelledAt: activity.cancelledAt,
			sessionStartsAt: activitySession.startsAt,
			sessionEndsAt: activitySession.endsAt,
			sessionAddress: activitySession.address,
		})
		.from(activity)
		.innerJoin(project, eq(project.id, activity.projectId))
		.innerJoin(
			participant,
			and(
				eq(participant.id, participantId),
				eq(participant.projectId, project.id),
			),
		)
		.innerJoin(user, eq(user.id, participant.userId))
		.leftJoin(activitySession, eq(activitySession.activityId, activity.id))
		.where(eq(activity.id, activityId));

	const first = rows[0];
	if (!first) {
		throw new Error(
			`[notifications] activity ${activityId} or participant ${participantId} not found.`,
		);
	}
	const shared: SharedActivity = {
		id: activityId,
		name: first.activityName,
		address: first.activityAddress,
		cancelledAt: first.activityCancelledAt,
		project: projectToShared({
			id: first.projectId,
			name: first.projectName,
			url: first.projectUrl,
			address: first.projectAddress,
			startDate: first.projectStartDate,
			endDate: first.projectEndDate,
			largeLogoDarkUrl: first.projectLogoDarkUrl,
			ownerId: first.projectOwnerId,
		}),
		sessions: rows
			.filter((row) => row.sessionStartsAt && row.sessionEndsAt)
			.map((row) => ({
				startsAt: row.sessionStartsAt!,
				endsAt: row.sessionEndsAt!,
				address: row.sessionAddress,
			})),
	};
	return assembleActivityProps(
		refs,
		{
			participantName: first.participantName,
			project: shared.project,
		},
		shared,
	);
}

function assembleActivityProps(
	refs: EntityRefs,
	perParticipant: { participantName: string; project: SharedProject },
	shared: SharedActivity,
): Record<string, unknown> {
	const activityDateText = formatActivitySessionsText(shared.sessions);
	const activityLocation =
		shared.address?.trim() || shared.project.address?.trim() || undefined;
	return {
		participantName: perParticipant.participantName,
		eventName: shared.project.name,
		activityName: shared.name,
		activityDateText,
		activityLocation,
		accessUrl: activityUrl(shared.project.url, shared.id),
		...logoRef(shared.project.largeLogoDarkUrl, shared.project.id),
		...(optionalString(refs, "reason")
			? { reason: optionalString(refs, "reason") }
			: {}),
		...(optionalString(refs, "changeSummary")
			? { changeSummary: optionalString(refs, "changeSummary") }
			: {}),
		...(optionalNumber(refs, "position")
			? { position: optionalNumber(refs, "position") }
			: {}),
	};
}

/** Whether the participant currently has a `participant` enrollment. */
async function hasActiveEnrollment(
	activityId: string,
	participantId: string,
): Promise<boolean> {
	const rows = await db
		.select({ activityId: participantOnActivity.activityId })
		.from(participantOnActivity)
		.where(
			and(
				eq(participantOnActivity.activityId, activityId),
				eq(participantOnActivity.participantId, participantId),
				eq(participantOnActivity.role, "participant"),
			),
		);
	return rows.length > 0;
}

async function activityExists(activityId: string): Promise<boolean> {
	const rows = await db
		.select({ id: activity.id })
		.from(activity)
		.where(eq(activity.id, activityId));
	return rows.length > 0;
}

async function waitlistStatus(
	enrollmentId?: string,
	activityId?: string,
	participantId?: string,
): Promise<string | null> {
	if (enrollmentId) {
		const rows = await db
			.select({ status: activityWaitlist.status })
			.from(activityWaitlist)
			.where(eq(activityWaitlist.id, enrollmentId));
		return rows[0]?.status ?? null;
	}
	if (activityId && participantId) {
		const rows = await db
			.select({ status: activityWaitlist.status })
			.from(activityWaitlist)
			.where(
				and(
					eq(activityWaitlist.activityId, activityId),
					eq(activityWaitlist.participantId, participantId),
				),
			);
		return rows[0]?.status ?? null;
	}
	return null;
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export const notificationRegistry = {
	event_registration_confirmation: {
		key: "event_registration_confirmation",
		audience: "participant",
		category: "transactional",
		scope: "event",
		defaultEnabled: true,
		description:
			"Confirmação enviada logo após a inscrição no evento, com data, local e link de acesso à inscrição.",
		entityRefs: ["registrationId"],
		idempotencyKeyFormat:
			"event_registration_confirmation:{registrationId}",
		buildIdempotencyKey: (refs) =>
			`event_registration_confirmation:${requiredString(refs, "registrationId")}`,
		async validate(refs) {
			const registrationId = requiredString(refs, "registrationId");
			const rows = await db
				.select({ id: participant.id })
				.from(participant)
				.where(eq(participant.id, registrationId));
			return rows.length > 0
				? { ok: true }
				: { ok: false, reason: "entity_gone" };
		},
		async buildProps(refs, ctx) {
			const registrationId = requiredString(refs, "registrationId");
			const row = await loadParticipantEvent(registrationId, ctx);
			if (!row) {
				throw new Error(
					`[notifications] participant ${registrationId} not found.`,
				);
			}
			return {
				participantName: row.participantName,
				eventName: row.project.name,
				eventDateText: formatEventDateText(
					row.project.startDate,
					row.project.endDate,
				),
				eventLocation: row.project.address ?? undefined,
				accessUrl: profileUrl(row.project.url, row.shortId),
				...logoRef(row.project.largeLogoDarkUrl, row.project.id),
			};
		},
		subject: (props) =>
			eventRegistrationConfirmationSubject({
				eventName: String(props["eventName"]),
			}),
		render: (props) => renderEventRegistrationConfirmation(props),
		previewProps: {
			participantName: "Maria Silva",
			eventName: "SECOMP 2026",
			eventDateText: "12 de abril de 2026, 14:00 – 18:00",
			eventLocation: "Campus A. C. Simões, Maceió – AL",
			accessUrl: "https://example.com/secomp-2026/profile/abc123?me=1",
			logoUrl: "https://example.com/secomp-logo-dark.png",
		},
		templateVersion: EVENT_REGISTRATION_CONFIRMATION_VERSION,
	} satisfies NotificationTypeDefinition,

	event_registration_removed: {
		key: "event_registration_removed",
		audience: "participant",
		category: "transactional",
		scope: "event",
		defaultEnabled: true,
		description:
			"Aviso ao participante quando a organização remove a inscrição dele do evento, com motivo opcional.",
		entityRefs: ["registrationId", "reason?"],
		idempotencyKeyFormat: "event_registration_removed:{registrationId}",
		buildIdempotencyKey: (refs) =>
			`event_registration_removed:${requiredString(refs, "registrationId")}`,
		async validate(refs) {
			const registrationId = requiredString(refs, "registrationId");
			const rows = await db
				.select({ id: participant.id })
				.from(participant)
				.where(eq(participant.id, registrationId));
			return rows.length > 0
				? { ok: true }
				: { ok: false, reason: "entity_gone" };
		},
		async buildProps(refs, ctx) {
			const registrationId = requiredString(refs, "registrationId");
			const row = await loadParticipantEvent(registrationId, ctx);
			if (!row) {
				throw new Error(
					`[notifications] participant ${registrationId} not found.`,
				);
			}
			const reason = optionalString(refs, "reason");
			return {
				participantName: row.participantName,
				eventName: row.project.name,
				accessUrl: eventUrl(row.project.url),
				...(reason ? { reason } : {}),
				...logoRef(row.project.largeLogoDarkUrl, row.project.id),
			};
		},
		subject: (props) =>
			eventRegistrationRemovedSubject({
				eventName: String(props["eventName"]),
			}),
		render: (props) => renderEventRegistrationRemoved(props),
		previewProps: {
			participantName: "Maria Silva",
			eventName: "SECOMP 2026",
			accessUrl: "https://example.com/secomp-2026",
			reason: "Inscrição duplicada.",
		},
		templateVersion: EVENT_REGISTRATION_REMOVED_VERSION,
	} satisfies NotificationTypeDefinition,

	activity_enrollment_confirmed: {
		key: "activity_enrollment_confirmed",
		audience: "participant",
		category: "transactional",
		scope: "activity",
		defaultEnabled: true,
		description:
			"Confirmação de inscrição em uma atividade, com data, horário e local.",
		entityRefs: ["activityId", "participantId"],
		idempotencyKeyFormat:
			"activity_enrollment_confirmed:{activityId}:{participantId}:{subscribedAt}",
		buildIdempotencyKey: (refs) =>
			`activity_enrollment_confirmed:${requiredString(refs, "activityId")}:${requiredString(refs, "participantId")}:${requiredString(refs, "subscribedAt")}`,
		async validate(refs) {
			const activityId = requiredString(refs, "activityId");
			const participantId = requiredString(refs, "participantId");
			if (!(await activityExists(activityId)))
				return { ok: false, reason: "entity_gone" };
			return (await hasActiveEnrollment(activityId, participantId))
				? { ok: true }
				: { ok: false, reason: "state_changed" };
		},
		buildProps: (refs, ctx) => buildActivityProps(refs, ctx),
		subject: (props) =>
			activityEnrollmentConfirmedSubject({
				activityName: String(props["activityName"]),
				eventName: String(props["eventName"]),
			}),
		render: (props) => renderActivityEnrollmentConfirmed(props),
		previewProps: {
			participantName: "Maria Silva",
			eventName: "SECOMP 2026",
			activityName: "Oficina de React",
			activityDateText: "12 de abril de 2026, 14:00 – 18:00",
			activityLocation: "Laboratório 4",
			accessUrl: "https://example.com/secomp-2026/schedule/activity-1",
		},
		templateVersion: ACTIVITY_ENROLLMENT_CONFIRMED_VERSION,
	} satisfies NotificationTypeDefinition,

	activity_waitlisted: {
		key: "activity_waitlisted",
		audience: "participant",
		category: "transactional",
		scope: "activity",
		defaultEnabled: true,
		description:
			"Confirmação de entrada na fila de espera de uma atividade lotada, com a posição atual.",
		entityRefs: [
			"activityId",
			"participantId",
			"enrollmentId",
			"position?",
		],
		idempotencyKeyFormat: "activity_waitlisted:{enrollmentId}",
		buildIdempotencyKey: (refs) =>
			`activity_waitlisted:${requiredString(refs, "enrollmentId")}`,
		async validate(refs) {
			const activityId = requiredString(refs, "activityId");
			if (!(await activityExists(activityId)))
				return { ok: false, reason: "entity_gone" };
			const status = await waitlistStatus(
				optionalString(refs, "enrollmentId"),
				activityId,
				requiredString(refs, "participantId"),
			);
			if (!status) return { ok: false, reason: "entity_gone" };
			return status === "waiting" || status === "offered"
				? { ok: true }
				: { ok: false, reason: "state_changed" };
		},
		buildProps: (refs, ctx) => buildActivityProps(refs, ctx),
		subject: (props) =>
			activityWaitlistedSubject({
				activityName: String(props["activityName"]),
				eventName: String(props["eventName"]),
			}),
		render: (props) => renderActivityWaitlisted(props),
		previewProps: {
			participantName: "Maria Silva",
			eventName: "SECOMP 2026",
			activityName: "Oficina de React",
			activityDateText: "12 de abril de 2026, 14:00 – 18:00",
			activityLocation: "Laboratório 4",
			accessUrl: "https://example.com/secomp-2026/schedule/activity-1",
			position: 3,
		},
		templateVersion: ACTIVITY_WAITLISTED_VERSION,
	} satisfies NotificationTypeDefinition,

	activity_waitlist_promoted: {
		key: "activity_waitlist_promoted",
		audience: "participant",
		category: "transactional",
		scope: "activity",
		defaultEnabled: true,
		description:
			"Aviso de que uma vaga abriu e o participante saiu da fila de espera já inscrito.",
		entityRefs: [
			"activityId",
			"participantId",
			"enrollmentId",
			"promotedAt",
		],
		idempotencyKeyFormat:
			"activity_waitlist_promoted:{enrollmentId}:{promotedAt}",
		buildIdempotencyKey: (refs) =>
			`activity_waitlist_promoted:${requiredString(refs, "enrollmentId")}:${requiredString(refs, "promotedAt")}`,
		async validate(refs) {
			const activityId = requiredString(refs, "activityId");
			const participantId = requiredString(refs, "participantId");
			if (!(await activityExists(activityId)))
				return { ok: false, reason: "entity_gone" };
			const status = await waitlistStatus(
				optionalString(refs, "enrollmentId"),
			);
			if (status === null) return { ok: false, reason: "entity_gone" };
			if (status !== "enrolled")
				return { ok: false, reason: "state_changed" };
			return (await hasActiveEnrollment(activityId, participantId))
				? { ok: true }
				: { ok: false, reason: "state_changed" };
		},
		buildProps: (refs, ctx) => buildActivityProps(refs, ctx),
		subject: (props) =>
			activityWaitlistPromotedSubject({
				activityName: String(props["activityName"]),
				eventName: String(props["eventName"]),
			}),
		render: (props) => renderActivityWaitlistPromoted(props),
		previewProps: {
			participantName: "Maria Silva",
			eventName: "SECOMP 2026",
			activityName: "Oficina de React",
			activityDateText: "12 de abril de 2026, 14:00 – 18:00",
			activityLocation: "Laboratório 4",
			accessUrl: "https://example.com/secomp-2026/schedule/activity-1",
		},
		templateVersion: ACTIVITY_WAITLIST_PROMOTED_VERSION,
	} satisfies NotificationTypeDefinition,

	activity_enrollment_cancelled: {
		key: "activity_enrollment_cancelled",
		audience: "participant",
		category: "transactional",
		scope: "activity",
		defaultEnabled: true,
		description:
			"Confirmação após o próprio participante cancelar a inscrição em uma atividade.",
		entityRefs: ["activityId", "participantId", "cancelledAt"],
		idempotencyKeyFormat:
			"activity_enrollment_cancelled:{activityId}:{participantId}:{cancelledAt}",
		buildIdempotencyKey: (refs) =>
			`activity_enrollment_cancelled:${requiredString(refs, "activityId")}:${requiredString(refs, "participantId")}:${requiredString(refs, "cancelledAt")}`,
		async validate(refs) {
			const activityId = requiredString(refs, "activityId");
			const participantId = requiredString(refs, "participantId");
			if (!(await activityExists(activityId)))
				return { ok: false, reason: "entity_gone" };
			// Only valid while the enrollment is actually gone.
			return (await hasActiveEnrollment(activityId, participantId))
				? { ok: false, reason: "state_changed" }
				: { ok: true };
		},
		buildProps: (refs, ctx) => buildActivityProps(refs, ctx),
		subject: (props) =>
			activityEnrollmentCancelledSubject({
				activityName: String(props["activityName"]),
				eventName: String(props["eventName"]),
			}),
		render: (props) => renderActivityEnrollmentCancelled(props),
		previewProps: {
			participantName: "Maria Silva",
			eventName: "SECOMP 2026",
			activityName: "Oficina de React",
			activityDateText: "12 de abril de 2026, 14:00 – 18:00",
			activityLocation: "Laboratório 4",
			accessUrl: "https://example.com/secomp-2026/schedule/activity-1",
		},
		templateVersion: ACTIVITY_ENROLLMENT_CANCELLED_VERSION,
	} satisfies NotificationTypeDefinition,

	activity_enrollment_removed: {
		key: "activity_enrollment_removed",
		audience: "participant",
		category: "transactional",
		scope: "activity",
		defaultEnabled: true,
		description:
			"Aviso quando a organização remove o participante de uma atividade, com motivo opcional.",
		entityRefs: ["activityId", "participantId", "removedAt", "reason?"],
		idempotencyKeyFormat:
			"activity_enrollment_removed:{activityId}:{participantId}:{removedAt}",
		buildIdempotencyKey: (refs) =>
			`activity_enrollment_removed:${requiredString(refs, "activityId")}:${requiredString(refs, "participantId")}:${requiredString(refs, "removedAt")}`,
		async validate(refs) {
			const activityId = requiredString(refs, "activityId");
			const participantId = requiredString(refs, "participantId");
			if (!(await activityExists(activityId)))
				return { ok: false, reason: "entity_gone" };
			return (await hasActiveEnrollment(activityId, participantId))
				? { ok: false, reason: "state_changed" }
				: { ok: true };
		},
		buildProps: (refs, ctx) => buildActivityProps(refs, ctx),
		subject: (props) =>
			activityEnrollmentRemovedSubject({
				activityName: String(props["activityName"]),
				eventName: String(props["eventName"]),
			}),
		render: (props) => renderActivityEnrollmentRemoved(props),
		previewProps: {
			participantName: "Maria Silva",
			eventName: "SECOMP 2026",
			activityName: "Oficina de React",
			activityDateText: "12 de abril de 2026, 14:00 – 18:00",
			activityLocation: "Laboratório 4",
			accessUrl: "https://example.com/secomp-2026/schedule/activity-1",
			reason: "Conflito de horário com outra atividade.",
		},
		templateVersion: ACTIVITY_ENROLLMENT_REMOVED_VERSION,
	} satisfies NotificationTypeDefinition,

	activity_updated: {
		key: "activity_updated",
		audience: "participant",
		category: "optional",
		scope: "activity",
		defaultEnabled: true,
		description:
			"Enviado aos inscritos quando data, horário ou local da atividade mudam.",
		entityRefs: [
			"activityId",
			"participantId",
			"changedAt",
			"changeSummary?",
		],
		idempotencyKeyFormat:
			"activity_updated:{activityId}:{changedAt}:{participantId}",
		buildIdempotencyKey: (refs) =>
			`activity_updated:${requiredString(refs, "activityId")}:${requiredString(refs, "changedAt")}:${requiredString(refs, "participantId")}`,
		async validate(refs) {
			const activityId = requiredString(refs, "activityId");
			const participantId = requiredString(refs, "participantId");
			const shared = await getSharedActivity(activityId);
			if (!shared) return { ok: false, reason: "entity_gone" };
			if (shared.cancelledAt)
				return { ok: false, reason: "state_changed" };
			return (await hasActiveEnrollment(activityId, participantId))
				? { ok: true }
				: { ok: false, reason: "state_changed" };
		},
		buildProps: (refs, ctx) => buildActivityProps(refs, ctx),
		subject: (props) =>
			activityUpdatedSubject({
				activityName: String(props["activityName"]),
				eventName: String(props["eventName"]),
			}),
		render: (props) => renderActivityUpdated(props),
		previewProps: {
			participantName: "Maria Silva",
			eventName: "SECOMP 2026",
			activityName: "Oficina de React",
			activityDateText: "13 de abril de 2026, 09:00 – 12:00",
			activityLocation: "Laboratório 7",
			changeSummary: "Data e local",
			accessUrl: "https://example.com/secomp-2026/schedule/activity-1",
		},
		templateVersion: ACTIVITY_UPDATED_VERSION,
	} satisfies NotificationTypeDefinition,

	activity_cancelled: {
		key: "activity_cancelled",
		audience: "participant",
		category: "transactional",
		scope: "activity",
		defaultEnabled: true,
		description:
			"Aviso de cancelamento da atividade para todos os inscritos e pessoas na fila de espera.",
		entityRefs: ["activityId", "participantId", "reason?"],
		idempotencyKeyFormat: "activity_cancelled:{activityId}:{participantId}",
		buildIdempotencyKey: (refs) =>
			`activity_cancelled:${requiredString(refs, "activityId")}:${requiredString(refs, "participantId")}`,
		async validate(refs) {
			const activityId = requiredString(refs, "activityId");
			const shared = await getSharedActivity(activityId);
			if (!shared) return { ok: false, reason: "entity_gone" };
			if (!shared.cancelledAt)
				return { ok: false, reason: "state_changed" };
			return { ok: true };
		},
		buildProps: (refs, ctx) => buildActivityProps(refs, ctx),
		subject: (props) =>
			activityCancelledSubject({
				activityName: String(props["activityName"]),
				eventName: String(props["eventName"]),
			}),
		render: (props) => renderActivityCancelled(props),
		previewProps: {
			participantName: "Maria Silva",
			eventName: "SECOMP 2026",
			activityName: "Oficina de React",
			activityDateText: "12 de abril de 2026, 14:00 – 18:00",
			activityLocation: "Laboratório 4",
			accessUrl: "https://example.com/secomp-2026/schedule",
			reason: "Palestrante indisponível.",
		},
		templateVersion: ACTIVITY_CANCELLED_VERSION,
	} satisfies NotificationTypeDefinition,

	email_quota_warning: {
		key: "email_quota_warning",
		audience: "organizer",
		category: "transactional",
		scope: "event",
		defaultEnabled: true,
		description:
			"Alerta ao organizador quando o uso diário de e-mails atinge 80% do limite (no máximo um por dia).",
		entityRefs: ["projectId", "used", "limit", "day"],
		idempotencyKeyFormat: "email_quota_warning:{YYYY-MM-DD}",
		buildIdempotencyKey: (refs) =>
			`email_quota_warning:${requiredString(refs, "day")}`,
		async validate(refs) {
			const projectId = requiredString(refs, "projectId");
			const rows = await db
				.select({ id: project.id })
				.from(project)
				.where(eq(project.id, projectId));
			return rows.length > 0
				? { ok: true }
				: { ok: false, reason: "entity_gone" };
		},
		async buildProps(refs, ctx) {
			const projectId = requiredString(refs, "projectId");
			let shared = ctx?.projects.get(projectId);
			if (!shared) {
				const rows = await db
					.select({
						id: project.id,
						name: project.name,
						url: project.url,
						address: project.address,
						startDate: project.startDate,
						endDate: project.endDate,
						largeLogoDarkUrl: project.largeLogoDarkUrl,
						ownerId: project.ownerId,
					})
					.from(project)
					.where(eq(project.id, projectId));
				const row = rows[0];
				if (!row) {
					throw new Error(
						`[notifications] project ${projectId} not found.`,
					);
				}
				shared = projectToShared(row);
				ctx?.projects.set(projectId, shared);
			}
			const ownerRows = await db
				.select({ name: user.name })
				.from(user)
				.where(eq(user.id, shared.ownerId));
			const ownerName = ownerRows[0]?.name?.trim() || "organização";
			return {
				organizerName: ownerName,
				eventName: shared.name,
				used: optionalNumber(refs, "used") ?? 0,
				limit: optionalNumber(refs, "limit") ?? 1,
				day: requiredString(refs, "day"),
				accessUrl: adminEmailsUrl(),
				...logoRef(shared.largeLogoDarkUrl, shared.id),
			};
		},
		subject: (props) =>
			emailQuotaWarningSubject({
				eventName: String(props["eventName"]),
			}),
		render: (props) => renderEmailQuotaWarning(props),
		previewProps: {
			organizerName: "João Organizador",
			eventName: "SECOMP 2026",
			used: 80,
			limit: 100,
			day: "2026-04-12",
			accessUrl: "https://example.com/dashboard/emails",
		},
		templateVersion: EMAIL_QUOTA_WARNING_VERSION,
	} satisfies NotificationTypeDefinition,
} as const satisfies Record<NotificationType, NotificationTypeDefinition>;

export type RegistryEntry = (typeof notificationRegistry)[NotificationType];

export function getNotificationDefinition(
	type: string,
): NotificationTypeDefinition | null {
	return (
		(notificationRegistry as Record<string, NotificationTypeDefinition>)[
			type
		] ?? null
	);
}

export function isNotificationTypeKey(
	value: string,
): value is NotificationType {
	return value in notificationRegistry;
}

/**
 * Types explicitly deferred (no cron in this task). Kept here so the
 * registry documents what is missing and the settings UI never shows them.
 *
 * TODO(activity_reminder): send a reminder before an enrolled activity
 * starts. Requires a scheduler/cron; the registry shape already supports it
 * (activityId + participantId refs, deterministic per-event key). When it
 * lands, add the type to NOTIFICATION_TYPE_KEYS, an entry here and a trigger
 * enqueued from a job — no service changes needed.
 */
export const DEFERRED_NOTIFICATION_TYPES = ["activity_reminder"] as const;
