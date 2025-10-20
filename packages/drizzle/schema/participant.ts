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
import { degreeLevelEnum } from "../enum/degree";

export const participant = pgTable(
	"participants",
	{
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
		registrationId: text("registration_id"),
		period: periodEnum("period"),
		degreeLevel: degreeLevelEnum("degree_level"),
		joinedAt: timestamp("joined_at").notNull().defaultNow(),
	},
	(table) => [uniqueIndex().on(table.userId, table.projectId), uniqueIndex().on(table.registrationId, table.projectId)],
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
	participantOnActivity: many(participantOnActivity),
}));
