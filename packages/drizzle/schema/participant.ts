import { relations } from "drizzle-orm";
import {
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { participantOnActivity } from "./participant-on-activity";
import { project } from "./project";
import { user } from "./user";
import { formAnswer } from "./form-answer";

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
	participantOnActivity: many(participantOnActivity),
	answers: many(formAnswer),
}));
