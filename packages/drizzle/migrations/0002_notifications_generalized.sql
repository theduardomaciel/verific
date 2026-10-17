CREATE TABLE "project_notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"enabled" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "payload" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "entity_refs" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "props_hash" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "skip_reason" text;--> statement-breakpoint
ALTER TABLE "project_notification_settings" ADD CONSTRAINT "project_notification_settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "project_notification_settings_project_type_unique" ON "project_notification_settings" USING btree ("project_id","type");--> statement-breakpoint
-- Legacy backfill: the confirmation idempotency key is
-- `event_registration_confirmation:<registrationId>`, so the participant id
-- can be recovered from the key without the old props blob.
UPDATE "notifications"
SET "entity_refs" = jsonb_build_object('registrationId', split_part("idempotency_key", ':', 2))
WHERE "type" = 'event_registration_confirmation'
	AND split_part("idempotency_key", ':', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';--> statement-breakpoint
-- Failed test rows whose entityRefs cannot be mapped from the legacy key are
-- not reprocessable anymore (no props to rebuild from); drop them.
DELETE FROM "notifications"
WHERE "status" = 'failed' AND "entity_refs" = '{}'::jsonb;--> statement-breakpoint
-- Props are no longer stored: rebuild always comes from entityRefs.
UPDATE "notifications" SET "payload" = NULL WHERE "payload" IS NOT NULL;