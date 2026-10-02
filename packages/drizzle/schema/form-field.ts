import { relations } from "drizzle-orm";
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { formVersion } from "./form-version";
import { project } from "./project";
import { formAnswer } from "./form-answer";
import { formFieldTypeEnum } from "../enum/form-field-type";

export type FormFieldOption = string;

export interface FormFieldValidation {
	min?: number;
	max?: number;
	minLength?: number;
	maxLength?: number;
	pattern?: string;
}

export interface FormFieldSnapshot {
	key: string;
	label: string;
	type: string;
	required: boolean;
	options?: FormFieldOption[] | null;
}

export const formField = pgTable(
	"form_fields",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		formVersionId: uuid("form_version_id")
			.notNull()
			.references(() => formVersion.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		key: text("key").notNull(),
		label: text("label").notNull(),
		type: formFieldTypeEnum("type").notNull(),
		helpText: text("help_text"),
		required: boolean("required").default(false).notNull(),
		order: integer("order").default(0).notNull(),
		halfWidth: boolean("half_width").default(false).notNull(),
		options: jsonb("options").$type<FormFieldOption[]>(),
		validation: jsonb("validation").$type<FormFieldValidation>(),
		isVisible: boolean("is_visible").default(true).notNull(),
		editableAfterSignup: boolean("editable_after_signup")
			.default(true)
			.notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [uniqueIndex().on(table.formVersionId, table.key)],
);

export const formFieldRelations = relations(formField, ({ one, many }) => ({
	version: one(formVersion, {
		fields: [formField.formVersionId],
		references: [formVersion.id],
	}),
	project: one(project, {
		fields: [formField.projectId],
		references: [project.id],
	}),
	answers: many(formAnswer),
}));
