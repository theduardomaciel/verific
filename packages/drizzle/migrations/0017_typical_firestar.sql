CREATE TABLE "event_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"activity_id" uuid,
	"participant_id" uuid,
	"actor_user_id" uuid,
	"type" text NOT NULL,
	"activity_name" text,
	"participant_name" text,
	"actor_name" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "event_logs" ADD CONSTRAINT "event_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "event_logs_project_created_idx" ON "event_logs" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "event_logs_project_type_idx" ON "event_logs" USING btree ("project_id","type");--> statement-breakpoint
CREATE INDEX "event_logs_activity_created_idx" ON "event_logs" USING btree ("activity_id","created_at");