import { relations, sql } from "drizzle-orm";
import {
	index,
	pgTable,
	text,
	boolean,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { account } from "./account";
import { participant } from "./participant";
import { project } from "./project";
import { projectModerator } from "./project-moderator";
import { session } from "./session";

export const user = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		email: text("email").notNull(),
		emailVerified: boolean("emailVerified").default(false).notNull(),
		publicEmail: text("public_email").notNull(),
		image_url: text("image_url"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		uniqueIndex().on(table.email),
		// Busca aproximada (typos/acentos) por nome e e-mail. A expressão usa
		// a forma imutável de `unaccent` para poder ser indexada.
		index("users_name_trgm_idx").using(
			"gin",
			sql`unaccent('unaccent', lower(${table.name})) gin_trgm_ops`,
		),
		index("users_email_trgm_idx").using(
			"gin",
			sql`unaccent('unaccent', lower(${table.email})) gin_trgm_ops`,
		),
	],
);

export const userRelations = relations(user, ({ many }) => ({
	accounts: many(account),
	sessions: many(session),
	participants: many(participant),
	projects: many(project),
	moderatedProjects: many(projectModerator),
}));
