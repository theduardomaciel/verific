CREATE TYPE "public"."form_field_type" AS ENUM('text', 'textarea', 'number', 'date', 'select_single', 'select_multiple', 'checkbox');--> statement-breakpoint
CREATE TABLE "form_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_version_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" "form_field_type" NOT NULL,
	"help_text" text,
	"required" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"options" jsonb,
	"validation" jsonb,
	"is_visible" boolean DEFAULT true NOT NULL,
	"editable_after_signup" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"form_version_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"value_text" text,
	"value_number" double precision,
	"value_date" timestamp,
	"value_json" jsonb,
	"field_snapshot" jsonb,
	"answered_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "participants_registration_id_project_id_index";--> statement-breakpoint
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_version_id_form_versions_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."form_versions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_field_id_form_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."form_fields"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_form_version_id_form_versions_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."form_versions"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_answers" ADD CONSTRAINT "form_answers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "form_versions_project_id_version_index" ON "form_versions" USING btree ("project_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "form_fields_form_version_id_key_index" ON "form_fields" USING btree ("form_version_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "form_answers_participant_id_field_id_index" ON "form_answers" USING btree ("participant_id","field_id");--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "course";--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "registration_id";--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "period";--> statement-breakpoint
ALTER TABLE "participants" DROP COLUMN "degree_level";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "research_url";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "is_research_enabled";--> statement-breakpoint
DROP TYPE "public"."course";--> statement-breakpoint
DROP TYPE "public"."degree_level";--> statement-breakpoint
DROP TYPE "public"."period";