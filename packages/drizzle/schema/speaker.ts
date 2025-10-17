import { pgTable, smallserial, text, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { project } from ".";
import { speakersOnActivity } from "./speaker-on-activity";

export const speaker = pgTable("speakers", {
	id: smallserial("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description"),
	imageUrl: text("image_url"),
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
	activities: many(speakersOnActivity),
}));
