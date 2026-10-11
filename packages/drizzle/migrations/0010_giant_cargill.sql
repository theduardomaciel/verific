ALTER TABLE "speakers" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "speakers" ADD COLUMN "participant_id" uuid;--> statement-breakpoint
ALTER TABLE "speakers" ADD CONSTRAINT "speakers_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE cascade;