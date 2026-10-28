CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE INDEX "users_name_trgm_idx" ON "users" USING gin (unaccent('unaccent', lower("name")) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "users_email_trgm_idx" ON "users" USING gin (unaccent('unaccent', lower("email")) gin_trgm_ops);