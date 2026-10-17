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
	queueEventRegistrationEmail,
} from "./registration-email";
import { sendNotification } from "./service";

const sendNotificationMock = vi.mocked(sendNotification);

const ARGS = {
	registrationId: "participant-1",
	to: "user@example.com",
	eventId: "event-1",
};

beforeEach(() => {
	vi.restoreAllMocks();
});

describe("buildRegistrationEmailInput", () => {
	it("builds the expected key, recipient and entityRefs", () => {
		const input = buildRegistrationEmailInput(ARGS);

		expect(input).toEqual({
			type: "event_registration_confirmation",
			idempotencyKey: "event_registration_confirmation:participant-1",
			to: "user@example.com",
			eventId: "event-1",
			entityRefs: { registrationId: "participant-1" },
		});
	});

	it("never stores template props", () => {
		const input = buildRegistrationEmailInput(ARGS);

		expect(input).not.toHaveProperty("payload");
		expect(Object.keys(input?.entityRefs ?? {})).toEqual([
			"registrationId",
		]);
	});

	it("returns null without a recipient email", () => {
		expect(
			buildRegistrationEmailInput({ ...ARGS, to: undefined }),
		).toBeNull();
		expect(buildRegistrationEmailInput({ ...ARGS, to: "  " })).toBeNull();
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
