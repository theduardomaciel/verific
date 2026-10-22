import { relations } from "drizzle-orm";
import {
	pgTable,
	text,
	timestamp,
	uuid,
	integer,
	doublePrecision,
	boolean,
	jsonb,
} from "drizzle-orm/pg-core";

import { activity } from "./activity";
import { formAnswer } from "./form-answer";
import { formField } from "./form-field";
import { formVersion } from "./form-version";
import { participant } from "./participant";
import { projectModerator } from "./project-moderator";
import { speaker } from "./speaker";
import { user } from "./user";

import type { GamificationConfig } from "../gamification";
import type { ProfileLayout } from "../profile-layout";
import type { EventTheme } from "../theme";

export const project = pgTable("projects", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	description: text("description"),
	welcomeMessage: text("welcome_message"),

	url: text("url").notNull(),

	// 📍 Location fields
	address: text("address").notNull(), // Human-readable address for display
	latitude: doublePrecision("latitude"),
	longitude: doublePrecision("longitude"),

	isRegistrationEnabled: boolean("is_registration_enabled").default(false),
	isArchived: boolean("is_archived").default(false),

	profilesEnabled: boolean("profiles_enabled").default(false),

	logoUrl: text("logo_url"),
	logoDarkUrl: text("logo_dark_url"),
	largeLogoUrl: text("large_logo_url"),
	largeLogoDarkUrl: text("large_logo_dark_url"),
	coverUrl: text("cover_url"),
	thumbnailUrl: text("thumbnail_url"),

	// Dimensões naturais dos logos (medidas no upload): o cabeçalho
	// reserva o espaço exato e evita salto de layout. Nulo = desconhecido
	// (linhas legadas; o fallback 150x28 segue valendo). Os logos
	// quadrados são sempre 1:1 (padding no upload), então guardam só o
	// lado; os horizontais preservam a proporção (largura e altura).
	logoSide: integer("logo_side"),
	logoDarkSide: integer("logo_dark_side"),
	largeLogoWidth: integer("large_logo_width"),
	largeLogoHeight: integer("large_logo_height"),
	largeLogoDarkWidth: integer("large_logo_dark_width"),
	largeLogoDarkHeight: integer("large_logo_dark_height"),

	primaryColor: text("primary_color"), // quando nulo, usar a cor padrão do sistema
	secondaryColor: text("secondary_color"), // quando nulo, usar a cor padrão do sistema

	theme: jsonb("theme").$type<EventTheme>(),

	profileLayout: jsonb("profile_layout").$type<ProfileLayout>(),

	gamification: jsonb("gamification").$type<GamificationConfig>(),

	startDate: timestamp("start_date").notNull(),
	endDate: timestamp("end_date").notNull(),

	ownerId: uuid("owner_id")
		.notNull()
		.references(() => user.id, {
			onDelete: "restrict",
			onUpdate: "cascade",
		}),

	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectRelations = relations(project, ({ many, one }) => ({
	activities: many(activity),
	participants: many(participant),
	speakers: many(speaker),
	moderators: many(projectModerator),
	formVersions: many(formVersion),
	formFields: many(formField),
	formAnswers: many(formAnswer),
	owner: one(user, {
		fields: [project.ownerId],
		references: [user.id],
	}),
}));
