import { relations } from "drizzle-orm";
import {
	doublePrecision,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { formVersion } from "./form-version";
import { formField, type FormFieldSnapshot } from "./form-field";
import { participant } from "./participant";
import { project } from "./project";

export const formAnswer = pgTable(
	"form_answers",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		participantId: uuid("participant_id")
			.notNull()
			.references(() => participant.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		fieldId: uuid("field_id")
			.notNull()
			.references(() => formField.id, {
				onDelete: "restrict",
				onUpdate: "cascade",
			}),
		formVersionId: uuid("form_version_id")
			.notNull()
			.references(() => formVersion.id, {
				onDelete: "restrict",
				onUpdate: "cascade",
			}),
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		valueText: text("value_text"),
		valueNumber: doublePrecision("value_number"),
		valueDate: timestamp("value_date"),
		valueJson: jsonb("value_json").$type<unknown>(),
		fieldSnapshot: jsonb("field_snapshot").$type<FormFieldSnapshot>(),
		answeredAt: timestamp("answered_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [uniqueIndex().on(table.participantId, table.fieldId)],
);

export const formAnswerRelations = relations(formAnswer, ({ one }) => ({
	participant: one(participant, {
		fields: [formAnswer.participantId],
		references: [participant.id],
	}),
	field: one(formField, {
		fields: [formAnswer.fieldId],
		references: [formField.id],
	}),
	version: one(formVersion, {
		fields: [formAnswer.formVersionId],
		references: [formVersion.id],
	}),
	project: one(project, {
		fields: [formAnswer.projectId],
		references: [project.id],
	}),
}));
