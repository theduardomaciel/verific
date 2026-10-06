import { relations } from "drizzle-orm";
import {
	boolean,
	pgTable,
	primaryKey,
	uuid,
} from "drizzle-orm/pg-core";

import { participant } from "./participant";
import { formField } from "./form-field";

/**
 * Visibilidade por campo no perfil público. Linhas existem SOMENTE p/
 * campos obrigatórios ligados ao layout (padrão = visível); some junto
 * com o link, com o campo ou ao virar opcional.
 */
export const profileFieldVisibility = pgTable(
	"profile_field_visibility",
	{
		participantId: uuid("participant_id")
			.notNull()
			.references(() => participant.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		fieldId: uuid("field_id")
			.notNull()
			.references(() => formField.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		visible: boolean("visible").default(true).notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.participantId, table.fieldId] }),
	],
);

export const profileFieldVisibilityRelations = relations(
	profileFieldVisibility,
	({ one }) => ({
		participant: one(participant, {
			fields: [profileFieldVisibility.participantId],
			references: [participant.id],
		}),
		field: one(formField, {
			fields: [profileFieldVisibility.fieldId],
			references: [formField.id],
		}),
	}),
);
