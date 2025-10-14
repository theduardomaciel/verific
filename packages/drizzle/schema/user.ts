import { relations } from "drizzle-orm";
import {
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { account, session, participant, project } from ".";

export const user = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		email: text("email").notNull(),
		emailVerified: timestamp("emailVerified", { mode: "date" }),
		public_email: text("public_email").notNull(),
		image_url: text("image_url"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [uniqueIndex().on(table.email)],
);

export const userRelations = relations(user, ({ many }) => ({
	accounts: many(account),
	sessions: many(session),
	participants: many(participant),
	projects: many(project),
}));
