ALTER TYPE "public"."form_field_type" ADD VALUE 'radio_group';--> statement-breakpoint
ALTER TABLE "form_sections" ADD COLUMN "visibility_rule" jsonb;
