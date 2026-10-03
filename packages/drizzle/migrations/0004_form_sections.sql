CREATE TABLE "form_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_version_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "form_fields" ADD COLUMN "section_id" uuid;--> statement-breakpoint
ALTER TABLE "form_sections" ADD CONSTRAINT "form_sections_form_version_id_form_versions_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."form_versions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_sections" ADD CONSTRAINT "form_sections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_section_id_form_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."form_sections"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
INSERT INTO "form_sections" ("form_version_id", "project_id", "title", "order") SELECT "id", "project_id", 'Dados da inscrição', 0 FROM "form_versions";--> statement-breakpoint
UPDATE "form_fields" SET "section_id" = (SELECT "form_sections"."id" FROM "form_sections" WHERE "form_sections"."form_version_id" = "form_fields"."form_version_id" LIMIT 1) WHERE "section_id" IS NULL;
