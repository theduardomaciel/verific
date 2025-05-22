import { relations } from "drizzle-orm";
import {
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { participantOnActivity, project, user } from ".";

// Enums
import { courseEnum } from "../enum/course";
import { periodEnum } from "../enum/period";
import { roleEnum } from "../enum/role";

export const participant = pgTable(
	"participants",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			})
			.unique(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),

		course: courseEnum("course"),
		registrationId: text("registration_id").unique(),
		period: periodEnum("period"),
		role: roleEnum("role").notNull().default("participant"),
		joinedAt: timestamp("joined_at").notNull().defaultNow(),
	},
	(table) => [uniqueIndex().on(table.userId, table.projectId)],
);

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
