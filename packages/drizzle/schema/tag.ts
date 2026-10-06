import { relations } from "drizzle-orm";
import {
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { project } from "./project";
import { tagOnActivity } from "./tag-on-activity";

export const tag = pgTable(
	"tags",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		name: text("name").notNull(),
		color: text("color").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [uniqueIndex().on(table.projectId, table.name)],
);

export const tagRelations = relations(tag, ({ one, many }) => ({
	project: one(project, {
		fields: [tag.projectId],
		references: [project.id],
	}),
	tagOnActivity: many(tagOnActivity),
}));
