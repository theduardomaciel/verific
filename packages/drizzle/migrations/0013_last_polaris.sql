CREATE INDEX IF NOT EXISTS "activity_waitlist_events_participant_id_idx" ON "activity_waitlist_events" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tag_activities_tag_id_idx" ON "tag_activities" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_field_visibility_field_id_idx" ON "profile_field_visibility" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_owner_id_idx" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "speakers_project_id_idx" ON "speakers" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "speakers_participant_id_idx" ON "speakers" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_moderators_user_id_idx" ON "project_moderators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_versions_activity_id_idx" ON "form_versions" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_sections_form_version_id_idx" ON "form_sections" USING btree ("form_version_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_fields_section_id_idx" ON "form_fields" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_answers_field_id_idx" ON "form_answers" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "form_answers_form_version_id_idx" ON "form_answers" USING btree ("form_version_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_status_sent_at_idx" ON "notifications" USING btree ("status","sent_at");