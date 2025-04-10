import { uuid } from "drizzle-orm/pg-core";
import {
	pgTable,
	primaryKey,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { activity, participant, project } from ".";
import { template } from "./template";

export const certificate = pgTable(
	"certificates",
	{
		token: uuid("token").defaultRandom().notNull().unique(),
		participantId: uuid("participant_id")
			.notNull()
			.references(() => participant.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		activityId: uuid("activity_id")
			.notNull()
			.references(() => activity.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		templateId: uuid("template_id")
			.notNull()
			.references(() => template.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		issuedAt: timestamp("issued_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex().on(table.token),
		primaryKey({
			columns: [table.token, table.participantId, table.activityId],
		}),
	],
);
