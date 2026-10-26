import { relations } from "drizzle-orm";
import {
	jsonb,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { project } from "./project";

/**
 * Layout do crachá por evento (uma linha por evento). O conteúdo é um
 * JSON versionado validado por `badgeLayoutSchema` (`@verific/badges`):
 * unidade canônica mm, posições relativas à área livre.
 */
export const badgeLayout = pgTable(
	"badge_layouts",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		layout: jsonb("layout").notNull().$type<unknown>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [uniqueIndex().on(table.projectId)],
);

export const badgeLayoutRelations = relations(badgeLayout, ({ one }) => ({
	project: one(project, {
		fields: [badgeLayout.projectId],
		references: [project.id],
	}),
}));
