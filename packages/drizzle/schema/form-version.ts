import { relations } from "drizzle-orm";
import {
	boolean,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	integer,
} from "drizzle-orm/pg-core";

import { project } from "./project";
import { user } from "./user";
import { formField } from "./form-field";
import { formSection } from "./form-section";
import { formAnswer } from "./form-answer";

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
		version: integer("version").notNull(),
		isPublished: boolean("is_published").default(false).notNull(),
		createdBy: uuid("created_by").references(() => user.id, {
			onDelete: "set null",
			onUpdate: "cascade",
		}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		publishedAt: timestamp("published_at"),
	},
	(table) => [uniqueIndex().on(table.projectId, table.version)],
);

export const formVersionRelations = relations(formVersion, ({ one, many }) => ({
	project: one(project, {
		fields: [formVersion.projectId],
		references: [project.id],
	}),
	fields: many(formField),
	sections: many(formSection),
	answers: many(formAnswer),
}));
