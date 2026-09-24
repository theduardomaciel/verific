import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from ".";

export const session = pgTable("sessions", {
	id: text("id").primaryKey(),
	token: text("token").notNull().unique(),
	userId: uuid("user_id")
		.notNull()
		.references(() => user.id, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),
	expiresAt: timestamp("expires_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));
