CREATE TABLE "activity_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocking_activity_id" uuid NOT NULL,
	"blocked_activity_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_conflicts" ADD CONSTRAINT "activity_conflicts_blocking_activity_id_activities_id_fk" FOREIGN KEY ("blocking_activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activity_conflicts" ADD CONSTRAINT "activity_conflicts_blocked_activity_id_activities_id_fk" FOREIGN KEY ("blocked_activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_activity_conflict" ON "activity_conflicts" USING btree ("blocking_activity_id","blocked_activity_id");--> statement-breakpoint
CREATE INDEX "activity_conflicts_blocking_idx" ON "activity_conflicts" USING btree ("blocking_activity_id");--> statement-breakpoint
CREATE INDEX "activity_conflicts_blocked_idx" ON "activity_conflicts" USING btree ("blocked_activity_id");