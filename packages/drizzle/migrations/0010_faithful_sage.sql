CREATE TYPE "public"."degree_level" AS ENUM('highschool', 'technical', 'undergraduate', 'master', 'doctorate', 'postdoc', 'other');--> statement-breakpoint
ALTER TYPE "public"."category" ADD VALUE 'seminar' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."category" ADD VALUE 'competition' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."category" ADD VALUE 'hackathon' BEFORE 'other';--> statement-breakpoint
ALTER TYPE "public"."category" ADD VALUE 'ceremony' BEFORE 'other';--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "degree_level" "degree_level";