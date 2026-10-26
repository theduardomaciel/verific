import "server-only";
import { db } from "@verific/drizzle";
import { and, eq, inArray, sql } from "@verific/drizzle/orm";
import { projectNotificationSetting } from "@verific/drizzle/schema";

import { getNotificationDefinition, notificationRegistry } from "./registry";

import type {
	NotificationAudience,
	NotificationCategory,
	NotificationScope,
} from "./registry";
import type { NotificationType } from "./types";

/**
 * TODO(per-user opt-out): the toggles here are per event only. Letting a
 * participant unsubscribe from optional e-mails would need a
 * `participant_notification_settings` table plus a second check inside
 * `isNotificationEnabled`; intentionally out of scope for now.
 */

export interface NotificationSettingItem {
	type: NotificationType;
	audience: NotificationAudience;
	category: NotificationCategory;
	scope: NotificationScope;
	enabled: boolean;
	defaultEnabled: boolean;
	description: string;
	entityRefs: readonly string[];
}

/**
 * Per-event toggle state merged with the registry metadata. A missing row
 * means the registry `defaultEnabled` still applies.
 */
export async function getEventNotificationSettings(
	projectId: string,
): Promise<NotificationSettingItem[]> {
	const rows = await db
		.select({
			type: projectNotificationSetting.type,
			enabled: projectNotificationSetting.enabled,
		})
		.from(projectNotificationSetting)
		.where(eq(projectNotificationSetting.projectId, projectId));
	const override = new Map(rows.map((row) => [row.type, row.enabled]));

	return Object.values(notificationRegistry).map((definition) => ({
		type: definition.key,
		audience: definition.audience,
		category: definition.category,
		scope: definition.scope,
		enabled: override.get(definition.key) ?? definition.defaultEnabled,
		defaultEnabled: definition.defaultEnabled,
		description: definition.description,
		entityRefs: definition.entityRefs,
	}));
}

/**
 * One query for many types (bulk enqueue): missing rows fall back to the
 * registry default.
 */
export async function getNotificationEnabledMap(
	projectId: string,
	types: NotificationType[],
): Promise<Map<string, boolean>> {
	const unique = [...new Set(types)];
	const rows = unique.length
		? await db
				.select({
					type: projectNotificationSetting.type,
					enabled: projectNotificationSetting.enabled,
				})
				.from(projectNotificationSetting)
				.where(
					and(
						eq(projectNotificationSetting.projectId, projectId),
						inArray(projectNotificationSetting.type, unique),
					),
				)
		: [];
	const override = new Map(rows.map((row) => [row.type, row.enabled]));
	const result = new Map<string, boolean>();
	for (const type of unique) {
		const definition = getNotificationDefinition(type);
		result.set(
			type,
			override.get(type) ?? definition?.defaultEnabled ?? true,
		);
	}
	return result;
}

/** Gate used by `sendNotification`: unknown types are never gated. */
export async function isNotificationEnabled(
	projectId: string,
	type: string,
): Promise<boolean> {
	const definition = getNotificationDefinition(type);
	if (!definition) return true;
	const rows = await db
		.select({ enabled: projectNotificationSetting.enabled })
		.from(projectNotificationSetting)
		.where(
			and(
				eq(projectNotificationSetting.projectId, projectId),
				eq(projectNotificationSetting.type, type),
			),
		);
	return rows[0]?.enabled ?? definition.defaultEnabled;
}

export interface NotificationSettingUpdate {
	type: string;
	enabled: boolean;
}

/**
 * Upserts the explicit organizer choices. Unknown types are ignored so a
 * stale client can never write arbitrary rows.
 */
export async function updateEventNotificationSettings(
	projectId: string,
	updates: NotificationSettingUpdate[],
): Promise<NotificationSettingItem[]> {
	const known = updates.filter((update) =>
		getNotificationDefinition(update.type),
	);
	if (known.length > 0) {
		await db
			.insert(projectNotificationSetting)
			.values(
				known.map((update) => ({
					projectId,
					type: update.type,
					enabled: update.enabled,
				})),
			)
			.onConflictDoUpdate({
				target: [
					projectNotificationSetting.projectId,
					projectNotificationSetting.type,
				],
				set: {
					enabled: sql`excluded."enabled"`,
				},
			});
	}
	return getEventNotificationSettings(projectId);
}
