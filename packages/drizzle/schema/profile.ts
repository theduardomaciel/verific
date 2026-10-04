import { relations } from "drizzle-orm";
import {
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { participant } from "./participant";
import type {
	AvatarSource,
	ProfilePrivacy,
	SocialLink,
} from "../profile";

export const profile = pgTable("profiles", {
	participantId: uuid("participant_id")
		.primaryKey()
		.references(() => participant.id, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),
	roleTitle: text("role_title"),
	birthDate: timestamp("birth_date"),
	city: text("city"),
	institution: text("institution"),
	bio: text("bio"),
	socials: jsonb("socials").$type<SocialLink[]>(),
	publicEmail: text("public_email"),
	avatarSource: text("avatar_source").$type<AvatarSource>().default("google"),
	avatarGithubHandle: text("avatar_github_handle"),
	privacy: jsonb("privacy").$type<ProfilePrivacy>(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const profileRelations = relations(profile, ({ one }) => ({
	participant: one(participant, {
		fields: [profile.participantId],
		references: [participant.id],
	}),
}));
