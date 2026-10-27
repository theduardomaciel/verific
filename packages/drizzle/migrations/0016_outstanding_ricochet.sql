ALTER TABLE "participant_activities" ADD COLUMN "no_show" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "participant_activities" ADD COLUMN "no_show_at" timestamp;