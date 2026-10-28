CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."immutable_unaccent"("value" text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;