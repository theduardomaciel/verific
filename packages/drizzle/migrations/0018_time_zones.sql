-- Instantes viram timestamptz com milissegundos. As colunas guardavam UTC sem
-- fuso, por isso o USING explícito. Um ALTER por tabela: reduzir a precisão
-- reescreve a tabela, e várias cláusulas no mesmo comando reescrevem uma vez só.
ALTER TABLE "accounts"
	ALTER COLUMN "access_token_expires_at" SET DATA TYPE timestamp (3) with time zone USING "access_token_expires_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "refresh_token_expires_at" SET DATA TYPE timestamp (3) with time zone USING "refresh_token_expires_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now(),
	ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone USING "updated_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "activities"
	ALTER COLUMN "cancelled_at" SET DATA TYPE timestamp (3) with time zone USING "cancelled_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "badge_layouts"
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now(),
	ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone USING "updated_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "activity_sessions"
	ALTER COLUMN "starts_at" SET DATA TYPE timestamp (3) with time zone USING "starts_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "ends_at" SET DATA TYPE timestamp (3) with time zone USING "ends_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "activity_conflicts"
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "activity_waitlist"
	ALTER COLUMN "joined_at" SET DATA TYPE timestamp (3) with time zone USING "joined_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "joined_at" SET DEFAULT now(),
	ALTER COLUMN "offered_at" SET DATA TYPE timestamp (3) with time zone USING "offered_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "offer_expires_at" SET DATA TYPE timestamp (3) with time zone USING "offer_expires_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "resolved_at" SET DATA TYPE timestamp (3) with time zone USING "resolved_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "activity_waitlist_events"
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "session_attendances"
	ALTER COLUMN "joined_at" SET DATA TYPE timestamp (3) with time zone USING "joined_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "joined_at" SET DEFAULT now(),
	ALTER COLUMN "left_at" SET DATA TYPE timestamp (3) with time zone USING "left_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "tags"
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "certificates"
	ALTER COLUMN "issued_at" SET DATA TYPE timestamp (3) with time zone USING "issued_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "issued_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "participant_activities"
	ALTER COLUMN "subscribedAt" SET DATA TYPE timestamp (3) with time zone USING "subscribedAt" AT TIME ZONE 'UTC',
	ALTER COLUMN "subscribedAt" SET DEFAULT now(),
	ALTER COLUMN "overbooked_at" SET DATA TYPE timestamp (3) with time zone USING "overbooked_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "participants"
	ALTER COLUMN "joined_at" SET DATA TYPE timestamp (3) with time zone USING "joined_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "joined_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "profile_connections"
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "projects"
	ALTER COLUMN "start_date" SET DATA TYPE timestamp (3) with time zone USING "start_date" AT TIME ZONE 'UTC',
	ALTER COLUMN "end_date" SET DATA TYPE timestamp (3) with time zone USING "end_date" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "sessions"
	ALTER COLUMN "expires_at" SET DATA TYPE timestamp (3) with time zone USING "expires_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now(),
	ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone USING "updated_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "project_moderators"
	ALTER COLUMN "assigned_at" SET DATA TYPE timestamp (3) with time zone USING "assigned_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "assigned_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "templates"
	ALTER COLUMN "issued_at" SET DATA TYPE timestamp (3) with time zone USING "issued_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "issued_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users"
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now(),
	ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone USING "updated_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verification"
	ALTER COLUMN "expires_at" SET DATA TYPE timestamp (3) with time zone USING "expires_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now(),
	ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone USING "updated_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "form_versions"
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now(),
	ALTER COLUMN "published_at" SET DATA TYPE timestamp (3) with time zone USING "published_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "form_sections"
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "form_fields"
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "form_answers"
	ALTER COLUMN "value_date" SET DATA TYPE date USING "value_date"::date,
	ALTER COLUMN "answered_at" SET DATA TYPE timestamp (3) with time zone USING "answered_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "answered_at" SET DEFAULT now(),
	ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone USING "updated_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notifications"
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now(),
	ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone USING "updated_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "updated_at" SET DEFAULT now(),
	ALTER COLUMN "sent_at" SET DATA TYPE timestamp (3) with time zone USING "sent_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "project_notification_settings"
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now(),
	ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone USING "updated_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "participant_checkins"
	ALTER COLUMN "checked_in_at" SET DATA TYPE timestamp (3) with time zone USING "checked_in_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "checked_in_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "participant_point_events"
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "participant_points"
	ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone USING "updated_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "participant_stickers"
	ALTER COLUMN "earned_at" SET DATA TYPE timestamp (3) with time zone USING "earned_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "earned_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "event_logs"
	ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone USING "created_at" AT TIME ZONE 'UTC',
	ALTER COLUMN "created_at" SET DEFAULT now();
