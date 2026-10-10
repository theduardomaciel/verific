CREATE TYPE "public"."waitlist_event_type" AS ENUM('joined', 'left', 'offered', 'confirmed', 'expired', 'promoted', 'removed');--> statement-breakpoint
CREATE TYPE "public"."waitlist_status" AS ENUM('waiting', 'offered', 'enrolled', 'left', 'expired', 'removed');--> statement-breakpoint
CREATE TABLE "activity_waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"status" "waitlist_status" DEFAULT 'waiting' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"offered_at" timestamp,
	"offer_expires_at" timestamp,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "activity_waitlist_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"type" "waitlist_event_type" NOT NULL,
	"actor_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "waitlist_offer_hours" integer DEFAULT 12 NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_waitlist" ADD CONSTRAINT "activity_waitlist_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activity_waitlist" ADD CONSTRAINT "activity_waitlist_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activity_waitlist_events" ADD CONSTRAINT "activity_waitlist_events_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activity_waitlist_events" ADD CONSTRAINT "activity_waitlist_events_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activity_waitlist_events" ADD CONSTRAINT "activity_waitlist_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activity_waitlist_active_entry" ON "activity_waitlist" USING btree ("activity_id","participant_id") WHERE "activity_waitlist"."status" in ('waiting', 'offered');--> statement-breakpoint
CREATE INDEX "activity_waitlist_queue" ON "activity_waitlist" USING btree ("activity_id","status","joined_at");--> statement-breakpoint
CREATE INDEX "activity_waitlist_events_activity_id_created_at_index" ON "activity_waitlist_events" USING btree ("activity_id","created_at");