import { relations } from "drizzle-orm";
import { jsonb, pgTable, smallserial, text, uuid } from "drizzle-orm/pg-core";

import { participant } from "./participant";
import { project } from "./project";
import { speakerOnActivity } from "./speaker-on-activity";

import type { SocialLinks } from "../profile-layout";

export const speaker = pgTable("speakers", {
	id: smallserial("id").primaryKey(),
	name: text("name").notNull(),
	// Short professional title (e.g. "Professora · UFAL"). Null = hidden.
	title: text("title"),
	description: text("description"),
	imageUrl: text("image_url"),
	// Social entries ({ service, value }) validated against SOCIAL_SERVICES.
	// Raw values as typed by the organizer; normalized to URLs at render.
	socials: jsonb("socials").$type<SocialLinks>(),
	// Organizer-declared intent (normalized lowercase). Nullable: speaker
	// without known email stays a static card until linked.
	email: text("email"),
	// Resolved link to the speaker's participant row in the same project.
	// Null = unclaimed/pending. SET NULL on participant delete so the
	// speaker card survives; organizer can re-link by correcting the email.
	participantId: uuid("participant_id").references(() => participant.id, {
		onDelete: "set null",
		onUpdate: "cascade",
	}),
	projectId: uuid("project_id")
		.notNull()
		.references(() => project.id, {
			onDelete: "cascade",
			onUpdate: "cascade",
		}),
});

export const speakerRelations = relations(speaker, ({ one, many }) => ({
	project: one(project, {
		fields: [speaker.projectId],
		references: [project.id],
	}),
	linkedParticipant: one(participant, {
		fields: [speaker.participantId],
		references: [participant.id],
	}),
	activities: many(speakerOnActivity),
}));
