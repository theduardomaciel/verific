-- activity_conflicts table already exists in production (created outside tracked migrations)
-- Only add the one-sided indexes for lookup by blocking/blocked activity
CREATE INDEX IF NOT EXISTS "activity_conflicts_blocking_idx" ON "activity_conflicts" USING btree ("blocking_activity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_conflicts_blocked_idx" ON "activity_conflicts" USING btree ("blocked_activity_id");