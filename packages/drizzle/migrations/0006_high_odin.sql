CREATE TABLE "profile_connections" (
	"viewer_participant_id" uuid NOT NULL,
	"viewed_participant_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_connections_viewer_participant_id_viewed_participant_id_pk" PRIMARY KEY("viewer_participant_id","viewed_participant_id")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "logo_dark_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "large_logo_dark_url" text;--> statement-breakpoint
ALTER TABLE "profile_connections" ADD CONSTRAINT "profile_connections_viewer_participant_id_participants_id_fk" FOREIGN KEY ("viewer_participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "profile_connections" ADD CONSTRAINT "profile_connections_viewed_participant_id_participants_id_fk" FOREIGN KEY ("viewed_participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "profile_connections" ADD CONSTRAINT "profile_connections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;