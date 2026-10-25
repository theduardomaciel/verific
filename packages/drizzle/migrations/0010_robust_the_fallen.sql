CREATE INDEX IF NOT EXISTS "activities_project_id_idx" ON "activities" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_sessions_activity_id_idx" ON "activity_sessions" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_waitlist_participant_id_idx" ON "activity_waitlist" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "speaker_on_activity_speaker_id_idx" ON "speaker_activities" USING btree ("speaker_id");