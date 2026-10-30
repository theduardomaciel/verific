import { relations } from "drizzle-orm";
import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";

import { instant } from "./columns";
import { participant } from "./participant";
import { project } from "./project";

/**
 * Conexão direcional: viewer visitou viewed no mesmo evento.
 * Visita = conexão (incoming no perfil visitado). PK (viewer, viewed)
 * garante idempotência: refresh/QR repetido não infla.
 * Somente participantes do evento; self-visit barrado na API.
 */
export const profileConnection = pgTable(
	"profile_connections",
	{
		viewerParticipantId: uuid("viewer_participant_id")
			.notNull()
			.references(() => participant.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		viewedParticipantId: uuid("viewed_participant_id")
			.notNull()
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
		createdAt: instant("created_at").defaultNow().notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.viewerParticipantId, table.viewedParticipantId],
		}),
		index("profile_connections_project_viewed_idx").on(
			table.projectId,
			table.viewedParticipantId,
		),
	],
);

export const profileConnectionRelations = relations(
	profileConnection,
	({ one }) => ({
		viewer: one(participant, {
			fields: [profileConnection.viewerParticipantId],
			references: [participant.id],
		}),
		viewed: one(participant, {
			fields: [profileConnection.viewedParticipantId],
			references: [participant.id],
		}),
		project: one(project, {
			fields: [profileConnection.projectId],
			references: [project.id],
		}),
	}),
);
