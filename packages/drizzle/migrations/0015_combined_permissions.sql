CREATE TYPE "public"."project_member_role" AS ENUM('admin', 'staff');--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "waitlist_offer_minutes" integer;--> statement-breakpoint
ALTER TABLE "participant_activities" ADD COLUMN "overbooked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "participant_activities" ADD COLUMN "overbook_reason" text;--> statement-breakpoint
ALTER TABLE "participant_activities" ADD COLUMN "overbooked_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "participant_activities" ADD COLUMN "overbooked_at" timestamp;--> statement-breakpoint
ALTER TABLE "participant_activities" ADD COLUMN "no_show" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_moderators" ADD COLUMN "role" "project_member_role" DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_moderators" ADD COLUMN "permissions" jsonb;--> statement-breakpoint
ALTER TABLE "project_moderators" ADD COLUMN "include_in_ranking" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "participant_activities" ADD CONSTRAINT "participant_activities_overbooked_by_user_id_users_id_fk" FOREIGN KEY ("overbooked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "participant_activities_activity_id_overbooked_index" ON "participant_activities" USING btree ("activity_id","overbooked");