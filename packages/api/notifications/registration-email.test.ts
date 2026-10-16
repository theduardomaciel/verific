import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@verific/drizzle", () => ({ db: {} }));
vi.mock("@verific/env", () => ({
	appUrl: "https://verific.app.br",
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
	logoDarkUrl: "https://example.com/dark-logo.png",
};

beforeEach(() => {
	vi.restoreAllMocks();
});

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
			accessUrl: "https://verific.app.br/secomp-2026/profile/abc123?me=1",
			logoUrl: "https://example.com/dark-logo.png",
		});
		expect(input?.payload).not.toHaveProperty("bannerUrl");
		expect(typeof input?.payload["eventDateText"]).toBe("string");
	});

	it("returns null without a recipient email", () => {
		expect(
			buildRegistrationEmailInput({ ...ARGS, to: undefined }),
		).toBeNull();
		expect(buildRegistrationEmailInput({ ...ARGS, to: "  " })).toBeNull();
	});

	it("uses a PNG dark wide logo directly", () => {
		const input = buildRegistrationEmailInput(ARGS);
		expect(input?.payload["logoUrl"]).toBe(
			"https://example.com/dark-logo.png",
		);
	});

	it("uses the text header for a WebP dark wide logo and warns", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		const input = buildRegistrationEmailInput({
			...ARGS,
			logoDarkUrl: "https://example.com/dark-logo.webp",
		});

		expect(input?.payload).not.toHaveProperty("logoUrl");
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toContain("event-1");
	});

	it("uses the text header without a dark wide logo", () => {
		const input = buildRegistrationEmailInput({
			...ARGS,
			logoDarkUrl: undefined,
		});
		expect(input?.payload).not.toHaveProperty("logoUrl");
	});

	it("drops non-https and SVG logos, and only warns for WebP", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

		for (const logoDarkUrl of [
			"https://example.com/dark-logo.svg",
			"http://example.com/dark-logo.png",
			"https://example.com/dark-logo.svg?x=1",
		]) {
			const input = buildRegistrationEmailInput({ ...ARGS, logoDarkUrl });
			expect(input?.payload).not.toHaveProperty("logoUrl");
		}
		expect(warn).not.toHaveBeenCalled();
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
