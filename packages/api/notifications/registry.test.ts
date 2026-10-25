import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, queue } = vi.hoisted(() => {
	const queue: unknown[][] = [];
	const chain: Record<string, unknown> = {};
	chain["from"] = () => chain;
	chain["innerJoin"] = () => chain;
	chain["leftJoin"] = () => chain;
	chain["where"] = async () => queue.shift() ?? [];
	const dbMock = { select: () => chain };
	return { dbMock, queue };
});

vi.mock("@verific/drizzle", () => ({ db: dbMock }));
vi.mock("@verific/env", () => ({
	env: {},
	appUrl: "https://example.com",
}));

import {
	notificationRegistry,
	getNotificationDefinition,
	isNotificationTypeKey,
	stableStringify,
	hashProps,
} from "./registry";
import { NOTIFICATION_TYPE_KEYS, NOTIFICATION_TYPE_LABELS } from "./types";

import type { EntityRefs } from "./types";

beforeEach(() => {
	queue.length = 0;
	vi.restoreAllMocks();
});

describe("registry validation", () => {
	it("covers every declared notification type exactly once", () => {
		expect(Object.keys(notificationRegistry).sort()).toEqual(
			[...NOTIFICATION_TYPE_KEYS].sort(),
		);
		for (const type of NOTIFICATION_TYPE_KEYS) {
			expect(isNotificationTypeKey(type)).toBe(true);
			expect(getNotificationDefinition(type)?.key).toBe(type);
			expect(
				NOTIFICATION_TYPE_LABELS[type]?.trim().length,
			).toBeGreaterThan(0);
		}
	});

	it.each([...NOTIFICATION_TYPE_KEYS])("%s is fully described", (type) => {
		const definition = notificationRegistry[type];

		expect(["participant", "organizer"]).toContain(definition.audience);
		expect(["transactional", "optional"]).toContain(definition.category);
		expect(["event", "activity"]).toContain(definition.scope);
		expect(typeof definition.defaultEnabled).toBe("boolean");
		expect(definition.description.trim().length).toBeGreaterThan(10);
		expect(definition.entityRefs.length).toBeGreaterThan(0);
		expect(definition.templateVersion).toMatch(/^v\d+$/);
		expect(definition.idempotencyKeyFormat).toContain(`${type}:`);
		expect(definition.previewProps).toBeTypeOf("object");
	});

	it.each([...NOTIFICATION_TYPE_KEYS])(
		"%s renders preview props to html, text and a subject",
		async (type) => {
			const definition = notificationRegistry[type];
			const rendered = await definition.render(definition.previewProps);

			expect(rendered.templateVersion).toBe(definition.templateVersion);
			expect(rendered.subject.trim().length).toBeGreaterThan(0);
			expect(rendered.html.length).toBeGreaterThan(0);
			expect(rendered.text.length).toBeGreaterThan(0);
			expect(
				definition.subject(definition.previewProps).trim().length,
			).toBeGreaterThan(0);
		},
	);

	it("returns null for unknown types", () => {
		expect(getNotificationDefinition("nope")).toBeNull();
		expect(isNotificationTypeKey("nope")).toBe(false);
	});
});

/**
 * Documented idempotency key per type. Deterministic per transition: replaying
 * the same transition must produce the same key and dedupe at insert time.
 */
const IDEMPOTENCY_CASES: Array<{
	type: (typeof NOTIFICATION_TYPE_KEYS)[number];
	refs: EntityRefs;
	expected: string;
}> = [
	{
		type: "event_registration_confirmation",
		refs: { registrationId: "p1" },
		expected: "event_registration_confirmation:p1",
	},
	{
		type: "event_registration_removed",
		refs: { registrationId: "p1" },
		expected: "event_registration_removed:p1",
	},
	{
		type: "activity_enrollment_confirmed",
		refs: {
			activityId: "a1",
			participantId: "p1",
			subscribedAt: "2026-01-01T00:00:00.000Z",
		},
		expected:
			"activity_enrollment_confirmed:a1:p1:2026-01-01T00:00:00.000Z",
	},
	{
		type: "activity_waitlisted",
		refs: { enrollmentId: "e1" },
		expected: "activity_waitlisted:e1",
	},
	{
		type: "activity_waitlist_promoted",
		refs: { enrollmentId: "e1", promotedAt: "2026-01-02T00:00:00.000Z" },
		expected: "activity_waitlist_promoted:e1:2026-01-02T00:00:00.000Z",
	},
	{
		type: "activity_waitlist_offered",
		refs: { enrollmentId: "e1", offeredAt: "2026-01-02T12:00:00.000Z" },
		expected: "activity_waitlist_offered:e1:2026-01-02T12:00:00.000Z",
	},
	{
		type: "activity_enrollment_cancelled",
		refs: {
			activityId: "a1",
			participantId: "p1",
			cancelledAt: "2026-01-03T00:00:00.000Z",
		},
		expected:
			"activity_enrollment_cancelled:a1:p1:2026-01-03T00:00:00.000Z",
	},
	{
		type: "activity_enrollment_removed",
		refs: {
			activityId: "a1",
			participantId: "p1",
			removedAt: "2026-01-04T00:00:00.000Z",
		},
		expected: "activity_enrollment_removed:a1:p1:2026-01-04T00:00:00.000Z",
	},
	{
		type: "activity_updated",
		refs: {
			activityId: "a1",
			changedAt: "2026-01-05T00:00:00.000Z",
			participantId: "p1",
		},
		expected: "activity_updated:a1:2026-01-05T00:00:00.000Z:p1",
	},
	{
		type: "activity_cancelled",
		refs: { activityId: "a1", participantId: "p1" },
		expected: "activity_cancelled:a1:p1",
	},
	{
		type: "email_quota_warning",
		refs: { day: "2026-04-12" },
		expected: "email_quota_warning:2026-04-12",
	},
	{
		type: "project_contributor_added",
		refs: { projectId: "p1", contributorUserId: "u1" },
		expected: "project_contributor_added:p1:u1",
	},
	{
		type: "project_contributor_removed",
		refs: { projectId: "p1", contributorUserId: "u1" },
		expected: "project_contributor_removed:p1:u1",
	},
	{
		type: "project_deleted",
		refs: { projectId: "p1", contributorUserId: "u1" },
		expected: "project_deleted:p1:u1",
	},
];

describe("idempotency keys", () => {
	it.each(IDEMPOTENCY_CASES)(
		"$type is $expected",
		({ type, refs, expected }) => {
			expect(notificationRegistry[type].buildIdempotencyKey(refs)).toBe(
				expected,
			);
		},
	);

	it.each(IDEMPOTENCY_CASES)("$type is deterministic", ({ type, refs }) => {
		const definition = notificationRegistry[type];
		expect(definition.buildIdempotencyKey(refs)).toBe(
			definition.buildIdempotencyKey({ ...refs }),
		);
	});

	it("changes when the transition scalar changes", () => {
		const confirmed = notificationRegistry.activity_enrollment_confirmed;
		const base: EntityRefs = {
			activityId: "a1",
			participantId: "p1",
			subscribedAt: "2026-01-01T00:00:00.000Z",
		};
		const replay: EntityRefs = {
			...base,
			subscribedAt: "2026-02-01T00:00:00.000Z",
		};

		expect(confirmed.buildIdempotencyKey(base)).not.toBe(
			confirmed.buildIdempotencyKey(replay),
		);
	});
});

/** Refs each `validate` needs to reach its first database read. */
const VALIDATE_REFS: Record<
	(typeof NOTIFICATION_TYPE_KEYS)[number],
	EntityRefs
> = {
	event_registration_confirmation: { registrationId: "p1" },
	event_registration_removed: { registrationId: "p1" },
	activity_enrollment_confirmed: { activityId: "a1", participantId: "p1" },
	activity_waitlisted: {
		activityId: "a1",
		participantId: "p1",
		enrollmentId: "e1",
	},
	activity_waitlist_promoted: {
		activityId: "a1",
		participantId: "p1",
		enrollmentId: "e1",
	},
	activity_waitlist_removed: {
		activityId: "a1",
		participantId: "p1",
	},
	activity_waitlist_offered: {
		activityId: "a1",
		participantId: "p1",
		enrollmentId: "e1",
	},
	activity_enrollment_cancelled: { activityId: "a1", participantId: "p1" },
	activity_enrollment_removed: { activityId: "a1", participantId: "p1" },
	activity_updated: { activityId: "a1", participantId: "p1" },
	activity_cancelled: { activityId: "a1", participantId: "p1" },
	email_quota_warning: {
		projectId: "event-1",
		used: 8,
		limit: 10,
		day: "2026-04-12",
	},
	project_contributor_added: {
		projectId: "event-1",
		contributorUserId: "user-1",
	},
	project_contributor_removed: {
		projectId: "event-1",
		contributorUserId: "user-1",
		projectName: "SECOMP 2026",
		recipientName: "Maria Silva",
	},
	project_deleted: {
		projectId: "event-1",
		contributorUserId: "user-1",
		projectName: "SECOMP 2026",
		recipientName: "Maria Silva",
	},
};

describe("validate", () => {
	it.each(
		[...NOTIFICATION_TYPE_KEYS].filter(
			(type) =>
				type !== "project_deleted" &&
				type !== "project_contributor_removed" &&
				type !== "event_registration_removed",
		),
	)("%s returns entity_gone when nothing is found", async (type) => {
		queue.length = 0;
		const definition = notificationRegistry[type];

		await expect(definition.validate(VALIDATE_REFS[type])).resolves.toEqual(
			{
				ok: false,
				reason: "entity_gone",
			},
		);
	});

	it("sends the registration removal only after the delete", async () => {
		const removed = notificationRegistry.event_registration_removed;

		queue.push([]);
		await expect(
			removed.validate({ registrationId: "p1" }),
		).resolves.toEqual({ ok: true });

		queue.push([{ id: "p1" }]);
		await expect(
			removed.validate({ registrationId: "p1" }),
		).resolves.toEqual({ ok: false, reason: "state_changed" });
	});

	it("builds the registration removal from the refs and the event", async () => {
		queue.push([
			{
				id: "event-1",
				name: "SECOMP",
				url: "secomp",
				address: null,
				startDate: new Date("2026-01-01"),
				endDate: new Date("2026-01-02"),
				largeLogoDarkUrl: null,
				ownerId: "owner-1",
			},
		]);

		await expect(
			notificationRegistry.event_registration_removed.buildProps(
				{
					registrationId: "p1",
					projectId: "event-1",
					participantName: "Ana",
				},
				undefined,
			),
		).resolves.toMatchObject({
			participantName: "Ana",
			eventName: "SECOMP",
			accessUrl: "https://example.com/secomp",
		});
	});

	it("returns state_changed when the enrollment is already gone", async () => {
		queue.push([{ id: "a1" }], []);

		await expect(
			notificationRegistry.activity_enrollment_confirmed.validate({
				activityId: "a1",
				participantId: "p1",
			}),
		).resolves.toEqual({ ok: false, reason: "state_changed" });
	});

	it("returns state_changed when the enrollment still exists", async () => {
		queue.push([{ id: "a1" }], [{ activityId: "a1" }]);

		await expect(
			notificationRegistry.activity_enrollment_cancelled.validate({
				activityId: "a1",
				participantId: "p1",
			}),
		).resolves.toEqual({ ok: false, reason: "state_changed" });
	});

	it("returns state_changed when a waitlist entry was closed", async () => {
		queue.push([{ id: "a1" }], [{ status: "removed" }]);

		await expect(
			notificationRegistry.activity_waitlisted.validate({
				activityId: "a1",
				participantId: "p1",
				enrollmentId: "e1",
			}),
		).resolves.toEqual({ ok: false, reason: "state_changed" });
	});

	it("returns ok while a waitlist offer is still open", async () => {
		queue.push([{ id: "a1" }], [{ status: "offered" }]);

		await expect(
			notificationRegistry.activity_waitlist_offered.validate({
				activityId: "a1",
				participantId: "p1",
				enrollmentId: "e1",
			}),
		).resolves.toEqual({ ok: true });
	});

	it("returns state_changed once a waitlist offer is no longer open", async () => {
		queue.push([{ id: "a1" }], [{ status: "expired" }]);

		await expect(
			notificationRegistry.activity_waitlist_offered.validate({
				activityId: "a1",
				participantId: "p1",
				enrollmentId: "e1",
			}),
		).resolves.toEqual({ ok: false, reason: "state_changed" });
	});

	it("returns state_changed for a cancelled or reactivated activity", async () => {
		queue.push([
			{
				id: "a1",
				name: "Oficina",
				address: null,
				cancelledAt: new Date(),
				projectId: "event-1",
				projectName: "Secomp",
				projectUrl: "secomp",
				projectAddress: null,
				projectStartDate: new Date(),
				projectEndDate: new Date(),
				projectLogoDarkUrl: null,
				projectOwnerId: "owner-1",
				sessionStartsAt: null,
				sessionEndsAt: null,
				sessionAddress: null,
			},
		]);
		await expect(
			notificationRegistry.activity_updated.validate({
				activityId: "a1",
				participantId: "p1",
			}),
		).resolves.toEqual({ ok: false, reason: "state_changed" });

		queue.push([
			{
				id: "a1",
				name: "Oficina",
				address: null,
				cancelledAt: null,
				projectId: "event-1",
				projectName: "Secomp",
				projectUrl: "secomp",
				projectAddress: null,
				projectStartDate: new Date(),
				projectEndDate: new Date(),
				projectLogoDarkUrl: null,
				projectOwnerId: "owner-1",
				sessionStartsAt: null,
				sessionEndsAt: null,
				sessionAddress: null,
			},
		]);
		await expect(
			notificationRegistry.activity_cancelled.validate({
				activityId: "a1",
				participantId: "p1",
			}),
		).resolves.toEqual({ ok: false, reason: "state_changed" });
	});

	it("returns ok while the event still exists", async () => {
		queue.push([{ id: "event-1" }]);

		await expect(
			notificationRegistry.email_quota_warning.validate({
				projectId: "event-1",
				used: 8,
				limit: 10,
				day: "2026-04-12",
			}),
		).resolves.toEqual({ ok: true });
	});
});

describe("buildProps", () => {
	function participantRow(logoUrl: string | null) {
		return {
			participantName: "Maria Silva",
			shortId: "abc123",
			projectId: "event-1",
			projectName: "Secomp UFAL 2026",
			projectUrl: "secomp-2026",
			projectAddress: "Campus A. C. Simões",
			projectStartDate: new Date("2026-04-12T14:00:00Z"),
			projectEndDate: new Date("2026-04-12T18:00:00Z"),
			projectLogoDarkUrl: logoUrl,
			projectOwnerId: "owner-1",
		};
	}

	it("rebuilds the confirmation props from the registration id alone", async () => {
		queue.push([participantRow("https://example.com/dark-logo.png")]);

		const props =
			await notificationRegistry.event_registration_confirmation.buildProps(
				{ registrationId: "p1" },
				undefined,
			);

		expect(props).toEqual({
			participantName: "Maria Silva",
			eventName: "Secomp UFAL 2026",
			eventDateText: "12 de abril de 2026, 11:00 – 15:00",
			eventLocation: "Campus A. C. Simões",
			accessUrl: "https://example.com/secomp-2026/profile/abc123?me=1",
			logoUrl: "https://example.com/dark-logo.png",
		});
	});

	it("warns and omits a WebP dark logo", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		queue.push([participantRow("https://example.com/dark-logo.webp")]);

		const props =
			await notificationRegistry.event_registration_confirmation.buildProps(
				{ registrationId: "p1" },
				undefined,
			);

		expect(props).not.toHaveProperty("logoUrl");
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toContain("event-1");
	});

	it("drops non-https and SVG logos without warning", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		for (const logoUrl of [
			"http://example.com/dark-logo.png",
			"https://example.com/dark-logo.svg",
			"https://example.com/dark-logo.svg?x=1",
		]) {
			queue.push([participantRow(logoUrl)]);
			const props =
				await notificationRegistry.event_registration_confirmation.buildProps(
					{ registrationId: "p1" },
					undefined,
				);
			expect(props).not.toHaveProperty("logoUrl");
		}
		expect(warn).not.toHaveBeenCalled();
	});

	it("keeps optional reason and changeSummary out when absent", async () => {
		queue.push([participantRow(null)]);
		const props =
			await notificationRegistry.event_registration_confirmation.buildProps(
				{ registrationId: "p1" },
				undefined,
			);

		expect(props).not.toHaveProperty("reason");
		expect(props).not.toHaveProperty("changeSummary");
		expect(props).not.toHaveProperty("logoUrl");
	});
});

describe("props hashing", () => {
	it("is stable regardless of key order", () => {
		const a = { b: 1, a: [2, { d: 4, c: 3 }] };
		const b = { a: [2, { c: 3, d: 4 }], b: 1 };

		expect(stableStringify(a)).toBe(stableStringify(b));
		expect(hashProps(a)).toBe(hashProps(b));
		expect(hashProps(a)).toMatch(/^[0-9a-f]{64}$/);
	});

	it("changes when props change", () => {
		expect(hashProps({ a: 1 })).not.toBe(hashProps({ a: 2 }));
	});
});
