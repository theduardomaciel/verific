import { relations } from "drizzle-orm";
import {
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	text,
	boolean,
} from "drizzle-orm/pg-core";

import { formAnswer } from "./form-answer";
import { participantOnActivity } from "./participant-on-activity";
import { project } from "./project";
import { sessionAttendance } from "./session-attendance";
import { user } from "./user";

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

		shortId: text("short_id").notNull(),

		/** Opt-out do ranking público (o próprio perfil segue visível). */
		rankingOptOut: boolean("ranking_opt_out").default(false).notNull(),
	},
	(table) => [
		uniqueIndex().on(table.userId, table.projectId),
		uniqueIndex().on(table.projectId, table.shortId),
	],
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
	sessionAttendances: many(sessionAttendance),
	answers: many(formAnswer),
}));
