import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { activity } from "./activity";
import { formAnswer } from "./form-answer";
import { formField } from "./form-field";
import { formSection } from "./form-section";
import { project } from "./project";
import { user } from "./user";

export const formVersion = pgTable(
	"form_versions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		// Null = event form. Set = form of a specific activity.
		activityId: uuid("activity_id").references(() => activity.id, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),
		version: integer("version").notNull(),
		isPublished: boolean("is_published").default(false).notNull(),
		createdBy: uuid("created_by").references(() => user.id, {
			onDelete: "set null",
			onUpdate: "cascade",
		}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		publishedAt: timestamp("published_at"),
	},
	(table) => [
		// The event form (activity_id IS NULL) and each activity keep their own
		// version sequence, so uniqueness is scoped. Two partial indexes keep
		// NULL handling correct on Postgres: a plain (project_id, activity_id,
		// version) index would treat every NULL activity_id as distinct and let
		// the event form reuse version numbers.
		uniqueIndex("form_versions_event_project_version_unique")
			.on(table.projectId, table.version)
			.where(sql`${table.activityId} is null`),
		uniqueIndex("form_versions_activity_project_version_unique")
			.on(table.projectId, table.activityId, table.version)
			.where(sql`${table.activityId} is not null`),
		index("form_versions_activity_id_idx").on(table.activityId),
	],
);

export const formVersionRelations = relations(formVersion, ({ one, many }) => ({
	project: one(project, {
		fields: [formVersion.projectId],
		references: [project.id],
	}),
	activity: one(activity, {
		fields: [formVersion.activityId],
		references: [activity.id],
	}),
	fields: many(formField),
	sections: many(formSection),
	answers: many(formAnswer),
}));
