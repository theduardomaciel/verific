ALTER TABLE "speaker_activities" DROP CONSTRAINT "speakers_on_activities_activity_id_fkey";
--> statement-breakpoint
ALTER TABLE "speaker_activities" DROP CONSTRAINT "speakers_on_activities_speaker_id_fkey";
--> statement-breakpoint
DROP INDEX "accounts_provider_provider_account_id_index";--> statement-breakpoint
DROP INDEX "participants_user_id_project_id_index";--> statement-breakpoint
DROP INDEX "participant_activities_participant_id_activity_id_index";--> statement-breakpoint
DROP INDEX "users_email_index";--> statement-breakpoint
DROP INDEX "certificates_token_index";--> statement-breakpoint
ALTER TABLE "speaker_activities" ALTER COLUMN "speaker_id" SET DATA TYPE "undefined"."smallserial";--> statement-breakpoint
ALTER TABLE "speaker_activities" ADD CONSTRAINT "speaker_activities_activity_id_speaker_id_pk" PRIMARY KEY("activity_id","speaker_id");--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "is_published" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "is_registration_open" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "speaker_activities" ADD CONSTRAINT "speaker_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "speaker_activities" ADD CONSTRAINT "speaker_activities_speaker_id_speakers_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_index" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_user_id_project_id_index" ON "participants" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participant_activities_participant_id_activity_id_index" ON "participant_activities" USING btree ("participant_id","activity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_index" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_token_index" ON "certificates" USING btree ("token");