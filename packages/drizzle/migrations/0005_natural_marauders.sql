CREATE TABLE "participant_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"day" date NOT NULL,
	"checked_in_at" timestamp DEFAULT now() NOT NULL,
	"checked_in_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "participant_point_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"source" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"points" integer NOT NULL,
	"note" text,
	"awarded_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant_points" (
	"participant_id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant_stickers" (
	"project_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"sticker_key" text NOT NULL,
	"source" text DEFAULT 'auto' NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"awarded_by_user_id" uuid,
	CONSTRAINT "participant_stickers_participant_id_sticker_key_pk" PRIMARY KEY("participant_id","sticker_key")
);
--> statement-breakpoint
ALTER TABLE "session_attendances" ADD COLUMN "left_at" timestamp;--> statement-breakpoint
ALTER TABLE "session_attendances" ADD COLUMN "left_at_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "ranking_opt_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "gamification" jsonb;--> statement-breakpoint
ALTER TABLE "participant_checkins" ADD CONSTRAINT "participant_checkins_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant_checkins" ADD CONSTRAINT "participant_checkins_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant_checkins" ADD CONSTRAINT "participant_checkins_checked_in_by_user_id_users_id_fk" FOREIGN KEY ("checked_in_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant_point_events" ADD CONSTRAINT "participant_point_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant_point_events" ADD CONSTRAINT "participant_point_events_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant_point_events" ADD CONSTRAINT "participant_point_events_awarded_by_user_id_users_id_fk" FOREIGN KEY ("awarded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant_points" ADD CONSTRAINT "participant_points_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant_points" ADD CONSTRAINT "participant_points_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant_stickers" ADD CONSTRAINT "participant_stickers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant_stickers" ADD CONSTRAINT "participant_stickers_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant_stickers" ADD CONSTRAINT "participant_stickers_awarded_by_user_id_users_id_fk" FOREIGN KEY ("awarded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "participant_checkins_participant_day_unique" ON "participant_checkins" USING btree ("participant_id","day");--> statement-breakpoint
CREATE INDEX "participant_checkins_project_day_idx" ON "participant_checkins" USING btree ("project_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_point_events_project_dedupe_unique" ON "participant_point_events" USING btree ("project_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "participant_point_events_project_participant_idx" ON "participant_point_events" USING btree ("project_id","participant_id");--> statement-breakpoint
CREATE INDEX "participant_points_project_total_idx" ON "participant_points" USING btree ("project_id","total");--> statement-breakpoint
CREATE INDEX "participant_stickers_project_sticker_idx" ON "participant_stickers" USING btree ("project_id","sticker_key");--> statement-breakpoint
ALTER TABLE "session_attendances" ADD CONSTRAINT "session_attendances_left_at_by_user_id_users_id_fk" FOREIGN KEY ("left_at_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;