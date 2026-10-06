CREATE TABLE "profiles" (
	"participant_id" uuid PRIMARY KEY NOT NULL,
	"role_title" text,
	"birth_date" timestamp,
	"city" text,
	"institution" text,
	"bio" text,
	"socials" jsonb,
	"public_email" text,
	"avatar_source" text DEFAULT 'google',
	"avatar_github_handle" text,
	"privacy" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "short_id" text;--> statement-breakpoint
UPDATE "participants" SET "short_id" = substr(md5(random()::text || "id"::text), 1, 12) WHERE "short_id" IS NULL;--> statement-breakpoint
ALTER TABLE "participants" ALTER COLUMN "short_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "profiles_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "profile_fill_at_signup" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "participants_project_id_short_id_index" ON "participants" USING btree ("project_id","short_id");