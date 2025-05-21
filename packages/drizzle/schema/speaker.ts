import { pgTable, smallserial, text, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { activity, project } from ".";

export const speaker = pgTable("speakers", {
	id: smallserial("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	imageUrl: text("image_url").notNull(),
	projectId: uuid("project_id")
		.notNull()
		.references(() => project.id, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),
});

export const speakerRelations = relations(speaker, ({ one, many }) => ({
	project: one(project, {
		fields: [speaker.projectId],
		references: [project.id],
	}),
	activities: many(activity),
}));
