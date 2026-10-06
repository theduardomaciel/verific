DROP TABLE "profiles" CASCADE;--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "profile_fill_at_signup";--> statement-breakpoint
ALTER TABLE "form_sections" DROP COLUMN "is_system";