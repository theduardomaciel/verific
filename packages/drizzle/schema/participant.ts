import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { participantOnActivity, project, user } from ".";

// Enums
import { courseEnum } from "../enum/course";
import { periodEnum } from "../enum/period";

export const participant = pgTable("participants", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => user.id, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),
	projectId: uuid("project_id")
		.notNull()
		.references(() => project.id, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),

	course: courseEnum("course"),
	registrationId: text("registration_id").unique(),
	period: periodEnum("period"),
	joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const participantRelations = relations(participant, ({ one, many }) => ({
	user: one(user, {
		fields: [participant.userId],
		references: [user.id],
	}),
	project: one(project, {
		fields: [participant.projectId],
		references: [project.id],
	}),
	participantsOnEvent: many(participantOnActivity),
}));
