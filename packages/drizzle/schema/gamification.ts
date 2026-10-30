import { relations } from "drizzle-orm";
import {
	date,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { instant } from "./columns";
import { participant } from "./participant";
import { project } from "./project";
import { user } from "./user";

import type { PointEventSource, StickerSource } from "../gamification";

/**
 * Presença no evento (check-in de recepção), um registro por dia.
 * Independente de pontos: o ledger só deriva pontos daqui quando a
 * gamificação está ligada.
 */
export const participantCheckin = pgTable(
	"participant_checkins",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		participantId: uuid("participant_id")
			.notNull()
			.references(() => participant.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		/** Dia do evento no fuso do evento (`YYYY-MM-DD`). */
		day: date("day").notNull(),
		checkedInAt: instant("checked_in_at").defaultNow().notNull(),
		checkedInByUserId: uuid("checked_in_by_user_id").references(
			() => user.id,
			{ onDelete: "set null", onUpdate: "cascade" },
		),
	},
	(table) => [
		uniqueIndex("participant_checkins_participant_day_unique").on(
			table.participantId,
			table.day,
		),
		index("participant_checkins_project_day_idx").on(
			table.projectId,
			table.day,
		),
	],
);

/**
 * Ledger de pontos: fonte de verdade auditável de cada lançamento.
 * `dedupeKey` garante idempotência (rescan, checkout repetido, replay).
 */
export const participantPointEvent = pgTable(
	"participant_point_events",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		participantId: uuid("participant_id")
			.notNull()
			.references(() => participant.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		source: text("source").$type<PointEventSource>().notNull(),
		dedupeKey: text("dedupe_key").notNull(),
		points: integer("points").notNull(),
		note: text("note"),
		awardedByUserId: uuid("awarded_by_user_id").references(() => user.id, {
			onDelete: "set null",
			onUpdate: "cascade",
		}),
		createdAt: instant("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("participant_point_events_project_dedupe_unique").on(
			table.projectId,
			table.dedupeKey,
		),
		index("participant_point_events_project_participant_idx").on(
			table.projectId,
			table.participantId,
		),
	],
);

/** Total agregado por participante — leitura O(1) do ranking. */
export const participantPoints = pgTable(
	"participant_points",
	{
		participantId: uuid("participant_id")
			.primaryKey()
			.references(() => participant.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		total: integer("total").default(0).notNull(),
		updatedAt: instant("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("participant_points_project_total_idx").on(
			table.projectId,
			table.total,
		),
	],
);

/** Adesivos conquistados (auto ou concedidos manualmente). */
export const participantSticker = pgTable(
	"participant_stickers",
	{
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		participantId: uuid("participant_id")
			.notNull()
			.references(() => participant.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		stickerKey: text("sticker_key").notNull(),
		source: text("source").$type<StickerSource>().default("auto").notNull(),
		earnedAt: instant("earned_at").defaultNow().notNull(),
		awardedByUserId: uuid("awarded_by_user_id").references(() => user.id, {
			onDelete: "set null",
			onUpdate: "cascade",
		}),
	},
	(table) => [
		primaryKey({ columns: [table.participantId, table.stickerKey] }),
		index("participant_stickers_project_sticker_idx").on(
			table.projectId,
			table.stickerKey,
		),
	],
);

export const participantCheckinRelations = relations(
	participantCheckin,
	({ one }) => ({
		participant: one(participant, {
			fields: [participantCheckin.participantId],
			references: [participant.id],
		}),
		project: one(project, {
			fields: [participantCheckin.projectId],
			references: [project.id],
		}),
		checkedInBy: one(user, {
			fields: [participantCheckin.checkedInByUserId],
			references: [user.id],
		}),
	}),
);

export const participantPointEventRelations = relations(
	participantPointEvent,
	({ one }) => ({
		participant: one(participant, {
			fields: [participantPointEvent.participantId],
			references: [participant.id],
		}),
		project: one(project, {
			fields: [participantPointEvent.projectId],
			references: [project.id],
		}),
		awardedBy: one(user, {
			fields: [participantPointEvent.awardedByUserId],
			references: [user.id],
		}),
	}),
);

export const participantPointsRelations = relations(
	participantPoints,
	({ one }) => ({
		participant: one(participant, {
			fields: [participantPoints.participantId],
			references: [participant.id],
		}),
		project: one(project, {
			fields: [participantPoints.projectId],
			references: [project.id],
		}),
	}),
);

export const participantStickerRelations = relations(
	participantSticker,
	({ one }) => ({
		participant: one(participant, {
			fields: [participantSticker.participantId],
			references: [participant.id],
		}),
		project: one(project, {
			fields: [participantSticker.projectId],
			references: [project.id],
		}),
		awardedBy: one(user, {
			fields: [participantSticker.awardedByUserId],
			references: [user.id],
		}),
	}),
);
