ALTER TYPE "public"."form_field_type" ADD VALUE 'radio_group' BEFORE 'checkbox';--> statement-breakpoint
ALTER TYPE "public"."form_field_type" ADD VALUE 'phone';--> statement-breakpoint
ALTER TYPE "public"."form_field_type" ADD VALUE 'email';--> statement-breakpoint
CREATE TABLE "activity_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_attendances" (
	"session_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_attendances_session_id_participant_id_pk" PRIMARY KEY("session_id","participant_id")
);
--> statement-breakpoint
CREATE TABLE "form_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_version_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"visibility_rule" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_fields" ADD COLUMN "section_id" uuid;--> statement-breakpoint
ALTER TABLE "form_fields" ADD COLUMN "allow_other" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_sessions" ADD CONSTRAINT "activity_sessions_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session_attendances" ADD CONSTRAINT "session_attendances_session_id_activity_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."activity_sessions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "session_attendances" ADD CONSTRAINT "session_attendances_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_sections" ADD CONSTRAINT "form_sections_form_version_id_form_versions_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."form_versions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_sections" ADD CONSTRAINT "form_sections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_section_id_form_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."form_sections"("id") ON DELETE set null ON UPDATE cascade;