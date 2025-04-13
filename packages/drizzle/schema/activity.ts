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

import { speaker, participantOnActivity, project } from ".";

export const activityAudiences = ["internal", "external"] as const;
export const audienceEnum = pgEnum("type", activityAudiences);

export const activityCategories = [
	"lecture",
	"workshop",
	"round-table",
	"course",
	"other",
] as const;
export const categoryEnum = pgEnum("category", activityCategories);

export const activity = pgTable("activities", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	description: text("description"),
	dateFrom: timestamp("date_from").notNull(),
	dateTo: timestamp("date_to").notNull(),
	audience: audienceEnum("audience").notNull().default("internal"),
	category: categoryEnum("category").notNull().default("other"),
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
	participantsOnActivity: many(participantOnActivity),
}));
