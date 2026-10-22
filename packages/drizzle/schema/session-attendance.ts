import { relations } from "drizzle-orm";
import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";

import { activitySession } from "./activity-session";
import { participant } from "./participant";
import { user } from "./user";

export const sessionAttendance = pgTable(
	"session_attendances",
	{
		sessionId: uuid("session_id")
			.notNull()
			.references(() => activitySession.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		participantId: uuid("participant_id")
			.notNull()
			.references(() => participant.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		joinedAt: timestamp("joined_at").defaultNow().notNull(),
		/** Saída registrada pela equipe (checkout); nulo = não houve checkout. */
		leftAt: timestamp("left_at"),
		leftAtByUserId: uuid("left_at_by_user_id").references(() => user.id, {
			onDelete: "set null",
			onUpdate: "cascade",
		}),
	},
	(table) => ({
		pk: primaryKey({ columns: [table.sessionId, table.participantId] }),
	}),
);

export const sessionAttendanceRelations = relations(
	sessionAttendance,
	({ one }) => ({
		session: one(activitySession, {
			fields: [sessionAttendance.sessionId],
			references: [activitySession.id],
		}),
		participant: one(participant, {
			fields: [sessionAttendance.participantId],
			references: [participant.id],
		}),
		leftBy: one(user, {
			fields: [sessionAttendance.leftAtByUserId],
			references: [user.id],
		}),
	}),
);
