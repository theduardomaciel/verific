CREATE TABLE IF NOT EXISTS "speakers_on_activities" (
	"activity_id" uuid NOT NULL,
	"speaker_id" "smallserial" NOT NULL,
	CONSTRAINT "speakers_on_activities_activity_id_speaker_id_pk" PRIMARY KEY("activity_id","speaker_id")
);
--> statement-breakpoint
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "banner_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "large_logo_url" text;--> statement-breakpoint
ALTER TABLE "speakers_on_activities" DROP CONSTRAINT IF EXISTS "speakers_on_activities_activity_id_activities_id_fk";
--> statement-breakpoint
ALTER TABLE "speakers_on_activities" ADD CONSTRAINT "speakers_on_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "speakers_on_activities" DROP CONSTRAINT IF EXISTS "speakers_on_activities_speaker_id_speakers_id_fk";
--> statement-breakpoint
ALTER TABLE "speakers_on_activities" ADD CONSTRAINT "speakers_on_activities_speaker_id_speakers_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activities" DROP CONSTRAINT IF EXISTS "activities_speaker_id_speakers_id_fk";
--> statement-breakpoint
ALTER TABLE "activities" DROP COLUMN IF EXISTS "speaker_id";