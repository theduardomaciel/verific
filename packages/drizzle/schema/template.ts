import { jsonb, smallint, uuid } from "drizzle-orm/pg-core";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const template = pgTable("templates", {
	id: uuid("id").defaultRandom().notNull().primaryKey(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	logos: jsonb("logos").$type<string[]>(),
	signatures:
		jsonb("signatures").$type<
			{
				name: string;
				role: string;
				signature_url: string;
			}[]
		>(),
	maxSignatures: smallint("max_signatures").notNull().default(2),
	issuedAt: timestamp("issued_at").defaultNow().notNull(),
});
