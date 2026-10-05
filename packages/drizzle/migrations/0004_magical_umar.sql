ALTER TYPE "public"."form_field_type" ADD VALUE 'social_links';--> statement-breakpoint
CREATE TABLE "profile_field_visibility" (
	"participant_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	CONSTRAINT "profile_field_visibility_participant_id_field_id_pk" PRIMARY KEY("participant_id","field_id")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "profile_layout" jsonb;--> statement-breakpoint
ALTER TABLE "profile_field_visibility" ADD CONSTRAINT "profile_field_visibility_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "profile_field_visibility" ADD CONSTRAINT "profile_field_visibility_field_id_form_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."form_fields"("id") ON DELETE cascade ON UPDATE cascade;