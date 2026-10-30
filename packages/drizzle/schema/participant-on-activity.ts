import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	pgTable,
	text,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { roleEnum } from "../enum/role";
import { activity } from "./activity";
import { instant } from "./columns";
import { participant } from "./participant";
import { user } from "./user";

export const participantOnActivity = pgTable(
	"participant_activities",
	{
		participantId: uuid("participant_id")
			.notNull()
			.references(() => participant.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		activityId: uuid("activity_id")
			.notNull()
			.references(() => activity.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		role: roleEnum("role").notNull().default("participant"),
		subscribedAt: instant("subscribedAt").notNull().defaultNow(),
		/**
		 * Inscrição além do limite de vagas, autorizada pela organização.
		 * A vaga não é oferecida a ninguém da fila enquanto este vínculo
		 * existir; ao removê-lo, `settleActivity` volta a oferecer a vaga.
		 */
		overbooked: boolean("overbooked").notNull().default(false),
		overbookReason: text("overbook_reason"),
		overbookedByUserId: uuid("overbooked_by_user_id").references(
			() => user.id,
			{
				onDelete: "set null",
				onUpdate: "cascade",
			},
		),
		overbookedAt: instant("overbooked_at"),
		/**
		 * Marcado quando o participante não registrou presença em nenhuma
		 * sessão encerrada da atividade. Usado para relatório e para liberar
		 * a vaga (overbooking) quando a organização decidir.
		 */
		noShow: boolean("no_show").notNull().default(false),
	},
	(table) => [
		uniqueIndex().on(table.participantId, table.activityId),
		index().on(table.activityId, table.role),
		index().on(table.activityId, table.overbooked),
	],
);

export const participantOnActivityRelations = relations(
	participantOnActivity,
	({ one }) => ({
		participant: one(participant, {
			fields: [participantOnActivity.participantId],
			references: [participant.id],
		}),
		activity: one(activity, {
			fields: [participantOnActivity.activityId],
			references: [activity.id],
		}),
	}),
);
