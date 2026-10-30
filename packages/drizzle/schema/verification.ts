import { index, pgTable, text } from "drizzle-orm/pg-core";

import { instant } from "./columns";

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: instant("expires_at").notNull(),
		createdAt: instant("created_at").defaultNow().notNull(),
		updatedAt: instant("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);
