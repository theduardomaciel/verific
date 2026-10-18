CREATE UNIQUE INDEX "project_moderators_project_user_unique" ON "project_moderators" USING btree ("project_id","user_id");--> statement-breakpoint
-- Safety step: entity_refs must never be NULL. The column was already
-- created NOT NULL DEFAULT '{}' in 0002, so this normalisation is a
-- defensive no-op kept in case a row slipped through outside migrations.
UPDATE "notifications" SET "entity_refs" = '{}'::jsonb WHERE "entity_refs" IS NULL;--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "payload";