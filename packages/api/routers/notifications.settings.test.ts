import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@verific/auth";

const { findProject, getSettings, updateSettings } = vi.hoisted(() => {
	const findProject = vi.fn();
	const getSettings = vi.fn(
		async (_projectId: string): Promise<unknown[]> => [],
	);
	const updateSettings = vi.fn(
		async (_projectId: string, settings: unknown[]): Promise<unknown[]> =>
			settings,
	);
	return { findProject, getSettings, updateSettings };
});

vi.mock("@verific/drizzle", () => ({
	db: { query: { project: { findFirst: findProject } } },
}));
vi.mock("@verific/env", () => ({
	env: {},
	appUrl: "https://example.com",
}));
vi.mock("../notifications", async (importOriginal) => ({
	...(await importOriginal<object>()),
	getEventNotificationSettings: getSettings,
	updateEventNotificationSettings: updateSettings,
}));

import { createCallerFactory } from "../trpc";
import { notificationsRouter } from "./notifications";

const createCaller = createCallerFactory(notificationsRouter);
const OWNER_ID = "owner-1";
const STRANGER_ID = "stranger-1";
const PROJECT_ID = randomUUID();

const session = { user: { id: OWNER_ID } } as unknown as Session;

function projectRow(ownerId: string, moderatorIds: string[] = []) {
	return {
		id: PROJECT_ID,
		ownerId,
		moderators: moderatorIds.map((userId) => ({ userId })),
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("notification settings access control", () => {
	it("rejects unknown events with NOT_FOUND", async () => {
		findProject.mockResolvedValue(null);
		const caller = createCaller({ session });

		await expect(
			caller.getNotificationSettings({ projectId: PROJECT_ID }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(getSettings).not.toHaveBeenCalled();
	});

	it("rejects non-members with FORBIDDEN on read and write", async () => {
		findProject.mockResolvedValue(projectRow(STRANGER_ID));
		const caller = createCaller({ session });

		await expect(
			caller.getNotificationSettings({ projectId: PROJECT_ID }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.updateNotificationSettings({
				projectId: PROJECT_ID,
				settings: [{ type: "activity_updated", enabled: false }],
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });

		expect(getSettings).not.toHaveBeenCalled();
		expect(updateSettings).not.toHaveBeenCalled();
	});

	it("allows the owner to read and update settings", async () => {
		findProject.mockResolvedValue(projectRow(OWNER_ID));
		getSettings.mockResolvedValue([
			{ type: "activity_updated", enabled: true },
		]);
		updateSettings.mockResolvedValue([
			{ type: "activity_updated", enabled: false },
		]);
		const caller = createCaller({ session });

		await expect(
			caller.getNotificationSettings({ projectId: PROJECT_ID }),
		).resolves.toEqual({
			settings: [{ type: "activity_updated", enabled: true }],
		});
		await expect(
			caller.updateNotificationSettings({
				projectId: PROJECT_ID,
				settings: [{ type: "activity_updated", enabled: false }],
			}),
		).resolves.toEqual({
			settings: [{ type: "activity_updated", enabled: false }],
		});

		expect(getSettings).toHaveBeenCalledWith(PROJECT_ID);
		expect(updateSettings).toHaveBeenCalledWith(PROJECT_ID, [
			{ type: "activity_updated", enabled: false },
		]);
	});

	it("allows moderators to write settings", async () => {
		findProject.mockResolvedValue(projectRow("someone-else", [OWNER_ID]));
		updateSettings.mockResolvedValue([]);
		const caller = createCaller({ session });

		await caller.updateNotificationSettings({
			projectId: PROJECT_ID,
			settings: [{ type: "email_quota_warning", enabled: false }],
		});

		expect(updateSettings).toHaveBeenCalledWith(PROJECT_ID, [
			{ type: "email_quota_warning", enabled: false },
		]);
	});

	it("rejects unknown notification types at the edge", async () => {
		findProject.mockResolvedValue(projectRow(OWNER_ID));
		const caller = createCaller({ session });

		await expect(
			caller.updateNotificationSettings({
				projectId: PROJECT_ID,
				settings: [
					{ type: "activity_reminder" as never, enabled: true },
				],
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(updateSettings).not.toHaveBeenCalled();
	});
});
