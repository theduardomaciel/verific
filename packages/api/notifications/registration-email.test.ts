import { describe, expect, it, vi } from "vitest";

vi.mock("@verific/drizzle", () => ({ db: {} }));
vi.mock("@verific/env", () => ({
	env: { NEXT_PUBLIC_VERCEL_URL: "example.com/" },
}));
vi.mock("./service", async (importOriginal) => {
	const original = (await importOriginal()) as unknown as Record<
		string,
		unknown
	>;
	return {
		...original,
		sendNotification: vi.fn(async () => ({ notification: null })),
	};
});

import {
	buildRegistrationEmailInput,
	formatEventDateText,
	normalizePublicBaseUrl,
	queueEventRegistrationEmail,
} from "./registration-email";
import { sendNotification } from "./service";

const sendNotificationMock = vi.mocked(sendNotification);

const ARGS = {
	registrationId: "participant-1",
	to: "user@example.com",
	eventId: "event-1",
	participantName: "Maria Silva",
	eventName: "Secomp UFAL 2026",
	eventUrlPath: "secomp-2026",
	shortId: "abc123",
	startDate: new Date("2026-04-12T14:00:00Z"),
	endDate: new Date("2026-04-12T18:00:00Z"),
	eventLocation: "Campus A. C. Simões",
	logoUrl: "https://example.com/logo.png",
};

describe("buildRegistrationEmailInput", () => {
	it("builds the expected key, recipient and payload", () => {
		const input = buildRegistrationEmailInput(ARGS);

		expect(input).toMatchObject({
			type: "event_registration_confirmation",
			idempotencyKey: "event_registration_confirmation:participant-1",
			to: "user@example.com",
			eventId: "event-1",
		});
		expect(input?.payload).toMatchObject({
			participantName: "Maria Silva",
			eventName: "Secomp UFAL 2026",
			accessUrl: "https://example.com/secomp-2026/profile/abc123?me=1",
			logoUrl: "https://example.com/logo.png",
		});
		expect(typeof input?.payload["eventDateText"]).toBe("string");
	});

	it("normalizes a host-only deployment URL for email links", () => {
		expect(normalizePublicBaseUrl("verific.vercel.app")).toBe(
			"https://verific.vercel.app",
		);
		expect(normalizePublicBaseUrl("https://verific.vercel.app/")).toBe(
			"https://verific.vercel.app",
		);
	});

	it("returns null without a recipient email", () => {
		expect(
			buildRegistrationEmailInput({ ...ARGS, to: undefined }),
		).toBeNull();
		expect(buildRegistrationEmailInput({ ...ARGS, to: "  " })).toBeNull();
	});

	it("drops unsafe logos instead of failing", () => {
		const input = buildRegistrationEmailInput({
			...ARGS,
			logoUrl: "https://example.com/logo.svg",
		});
		expect(input?.payload["logoUrl"]).toBe(
			"https://example.com/logo_blue.png",
		);
		expect(input?.payload["logoAlt"]).toBe("verifIC");
	});

	it("falls back to the brand logo without an event logo", () => {
		const input = buildRegistrationEmailInput({
			...ARGS,
			logoUrl: undefined,
		});
		expect(input?.payload["logoUrl"]).toBe(
			"https://example.com/logo_blue.png",
		);
		expect(input?.payload["logoAlt"]).toBe("verifIC");
	});

	it("keeps the event logo and default alt when usable", () => {
		const input = buildRegistrationEmailInput(ARGS);
		expect(input?.payload["logoUrl"]).toBe("https://example.com/logo.png");
		expect(input?.payload).not.toHaveProperty("logoAlt");
	});
});

describe("formatEventDateText", () => {
	it("shows a time window for single-day events", () => {
		expect(
			formatEventDateText(
				new Date("2026-04-12T14:00:00Z"),
				new Date("2026-04-12T18:00:00Z"),
			),
		).toBe("12 de abril de 2026, 11:00 – 15:00");
	});

	it("shows a date range for multi-day events", () => {
		expect(
			formatEventDateText(
				new Date("2026-04-12T14:00:00Z"),
				new Date("2026-04-14T18:00:00Z"),
			),
		).toBe("12 de abril de 2026 – 14 de abril de 2026");
	});
});

describe("queueEventRegistrationEmail", () => {
	it("calls sendNotification once with the expected key", async () => {
		queueEventRegistrationEmail(ARGS);

		await vi.waitFor(() => {
			expect(sendNotificationMock).toHaveBeenCalledTimes(1);
		});
		expect(sendNotificationMock).toHaveBeenCalledWith(
			expect.objectContaining({
				idempotencyKey: "event_registration_confirmation:participant-1",
			}),
		);
	});

	it("never throws, even when the provider fails", async () => {
		sendNotificationMock.mockRejectedValueOnce(new Error("boom"));

		expect(() => queueEventRegistrationEmail(ARGS)).not.toThrow();
		await vi.waitFor(() => {
			expect(sendNotificationMock).toHaveBeenCalled();
		});
	});
});
