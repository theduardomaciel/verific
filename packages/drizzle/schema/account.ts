import { relations } from "drizzle-orm";
import {
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./user";

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
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [uniqueIndex().on(table.providerId, table.accountId)],
);

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));
