import { relations } from "drizzle-orm";
import {
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { formVersion } from "./form-version";
import { project } from "./project";
import { formField } from "./form-field";

export type SectionVisibilityOperator =
	| "is_checked"
	| "is_not_checked"
	| "equals"
	| "includes_any"
	| "includes_all";

export interface SectionVisibilityRule {
	sourceFieldId: string;
	operator: SectionVisibilityOperator;
	values?: string[];
}

export const formSection = pgTable("form_sections", {
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
	title: text("title").notNull(),
	order: integer("order").default(0).notNull(),
	visibilityRule: jsonb("visibility_rule").$type<SectionVisibilityRule>(),
	/** Marcador de seção fixa do sistema (ex: "profile"). Null = seção normal. */
	isSystem: text("is_system"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const formSectionRelations = relations(formSection, ({ one, many }) => ({
	version: one(formVersion, {
		fields: [formSection.formVersionId],
		references: [formVersion.id],
	}),
	project: one(project, {
		fields: [formSection.projectId],
		references: [project.id],
	}),
	fields: many(formField),
}));
