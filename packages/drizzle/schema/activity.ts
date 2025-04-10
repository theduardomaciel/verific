import { relations } from "drizzle-orm";
import {
	integer,
	pgEnum,
	pgTable,
	smallserial,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { speaker, participantOnEvent, project } from ".";

export const activityTypes = ["internal", "external"] as const;
export const typeEnum = pgEnum("type", activityTypes);

export const activity = pgTable("activities", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	description: text("description"),
	dateFrom: timestamp("date_from").notNull(),
	dateTo: timestamp("date_to").notNull(),
	type: typeEnum("type").notNull().default("internal"),
	speakerId: smallserial("speaker_id").references(() => speaker.id, {
		onDelete: "set null",
		onUpdate: "cascade",
	}),
	workload: integer("workload"),
	projectId: uuid("project_id")
		.notNull()
		.references(() => project.id, {
			onDelete: "restrict",
			onUpdate: "cascade",
		}),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activityRelations = relations(activity, ({ one, many }) => ({
	project: one(project, {
		fields: [activity.projectId],
		references: [project.id],
	}),
	speaker: one(speaker, {
		fields: [activity.speakerId],
		references: [speaker.id],
	}),
	participantsOnEvent: many(participantOnEvent),
}));
