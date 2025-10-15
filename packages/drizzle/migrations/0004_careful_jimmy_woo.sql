ALTER TABLE "activities" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "welcome_message" text;