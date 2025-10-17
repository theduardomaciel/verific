DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'speakers_on_activities') AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'speaker_activities') THEN
    ALTER TABLE "speakers_on_activities" RENAME TO "speaker_activities";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "speaker_activities" DROP CONSTRAINT IF EXISTS "speakers_on_activities_activity_id_activities_id_fk";
--> statement-breakpoint
ALTER TABLE "speaker_activities" DROP CONSTRAINT IF EXISTS "speakers_on_activities_speaker_id_speakers_id_fk";
--> statement-breakpoint
ALTER TABLE "speaker_activities" DROP CONSTRAINT IF EXISTS "speakers_on_activities_activity_id_speaker_id_pk";--> statement-breakpoint
ALTER TABLE "speaker_activities" ADD CONSTRAINT "speaker_activities_activity_id_speaker_id_pk" PRIMARY KEY("activity_id","speaker_id");--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "is_published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "is_registration_open" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "speaker_activities" ADD CONSTRAINT "speaker_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "speaker_activities" ADD CONSTRAINT "speaker_activities_speaker_id_speakers_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers"("id") ON DELETE cascade ON UPDATE cascade;