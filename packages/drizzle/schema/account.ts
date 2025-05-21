import { relations } from "drizzle-orm";
import { integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from ".";

export const account = pgTable(
	"accounts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
				onUpdate: "cascade",
			}),
		//
		type: text("type").notNull(),
		provider: text("provider").notNull(),
		providerAccountId: text("provider_account_id").notNull(),
		refreshToken: text("refresh_token"),
		accessToken: text("access_token"),
		expiresAt: integer("expires_at"),
		tokenType: text("token_type"),
		scope: text("scope"),
		idToken: text("id_token"),
		sessionState: text("session_state"),
	},
	(table) => [uniqueIndex().on(table.provider, table.providerAccountId)],
);

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));
