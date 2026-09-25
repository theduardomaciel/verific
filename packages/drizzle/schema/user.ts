import { relations } from "drizzle-orm";
import {
	pgTable,
	text,
	boolean,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { account } from "./account";
import { session } from "./session";
import { participant } from "./participant";
import { project } from "./project";
import { projectModerator } from "./project-moderator";

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
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [uniqueIndex().on(table.email)],
);

export const userRelations = relations(user, ({ many }) => ({
	accounts: many(account),
	sessions: many(session),
	participants: many(participant),
	projects: many(project),
	moderatedProjects: many(projectModerator),
}));
