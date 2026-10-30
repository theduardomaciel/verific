import { jsonb, smallint, uuid, pgTable, text } from "drizzle-orm/pg-core";

import { instant } from "./columns";

export const template = pgTable("templates", {
	id: uuid("id").defaultRandom().notNull().primaryKey(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	logos: jsonb("logos").$type<string[]>(),
	signatures: jsonb("signatures").$type<
		{
			name: string;
			role: string;
			signature_url: string;
		}[]
	>(),
	maxSignatures: smallint("max_signatures").notNull().default(2),
	issuedAt: instant("issued_at").defaultNow().notNull(),
});
