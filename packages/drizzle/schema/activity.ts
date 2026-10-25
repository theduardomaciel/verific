import { relations } from "drizzle-orm";
import {
	boolean,
	doublePrecision,
	integer,
	index,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { audienceEnum } from "../enum/audience";
import { categoryEnum } from "../enum/category";
import { activityConflict } from "./activity-conflict";
import { activitySession } from "./activity-session";
import { activityWaitlist } from "./activity-waitlist";
import { participantOnActivity } from "./participant-on-activity";
import { project } from "./project";
import { speakerOnActivity } from "./speaker-on-activity";
import { tagOnActivity } from "./tag-on-activity";

export const activity = pgTable(
	"activities",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		description: text("description"),
		bannerUrl: text("banner_url"),
		isPublished: boolean("is_published").notNull().default(true),
		isRegistrationOpen: boolean("is_registration_open")
			.notNull()
			.default(true),

		audience: audienceEnum("audience").notNull().default("internal"),
		category: categoryEnum("category").notNull().default("other"),

		participantsLimit: integer("participants_limit"),
		tolerance: integer("tolerance"),
		workload: doublePrecision("workload"),
		allowOverlap: boolean("allow_overlap").notNull().default(false),
		waitlistEnabled: boolean("waitlist_enabled").notNull().default(true),
		waitlistOfferHours: integer("waitlist_offer_hours")
			.notNull()
			.default(12),

		address: text("address"),
		latitude: doublePrecision("latitude"),
		longitude: doublePrecision("longitude"),

		cancelledAt: timestamp("cancelled_at"),

		projectId: uuid("project_id")
			.notNull()
			.references(() => project.id, {
				onDelete: "restrict",
				onUpdate: "cascade",
			}),

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("activities_project_id_idx").on(table.projectId)],
);

export const activityRelations = relations(activity, ({ one, many }) => ({
	project: one(project, {
		fields: [activity.projectId],
		references: [project.id],
	}),
	participantOnActivity: many(participantOnActivity),
	speakerOnActivity: many(speakerOnActivity),
	sessions: many(activitySession),
	tagOnActivity: many(tagOnActivity),
	waitlist: many(activityWaitlist),
	conflictsAsBlocking: many(activityConflict, {
		relationName: "blockingActivities",
	}),
	conflictsAsBlocked: many(activityConflict, {
		relationName: "blockedActivities",
	}),
}));
