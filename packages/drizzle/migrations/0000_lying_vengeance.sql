-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
CREATE TYPE "public"."audience" AS ENUM('internal', 'external');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('lecture', 'workshop', 'round-table', 'course', 'other');--> statement-breakpoint
CREATE TYPE "public"."course" AS ENUM('Administração', 'Administração Pública', 'Agroecologia', 'Agronomia', 'Arquitetura E Urbanismo', 'Biblioteconomia', 'Ciência Da Computação', 'Ciências Biológicas', 'Ciências Contábeis', 'Ciências Econômicas', 'Ciências Sociais', 'Ciências: Biologia, Física E Química', 'Comunicação Social (Jornalismo)', 'Comunicação Social (Relações Públicas)', 'Dança', 'Design', 'Direito', 'Educação Física', 'Enfermagem', 'Engenharia Ambiental E Sanitária', 'Engenharia Civil', 'Engenharia De Agrimensura', 'Engenharia De Computação', 'Engenharia De Energia', 'Engenharia De Pesca', 'Engenharia De Petróleo', 'Engenharia De Produção', 'Engenharia Elétrica', 'Engenharia Florestal', 'Engenharia Química', 'Farmácia', 'Filosofia', 'Física', 'Geografia', 'História', 'Jornalismo', 'Letras', 'Letras (Espanhol)', 'Letras (Francês)', 'Letras (Inglês)', 'Letras (Português)', 'Letras Libras', 'Matemática', 'Medicina', 'Medicina Veterinária', 'Meteorologia', 'Música', 'Música (Canto)', 'Nutrição', 'Odontologia', 'Pedagogia', 'Psicologia', 'Química', 'Química Tecnológica E Industrial', 'Relações Públicas', 'Serviço Social', 'Sistemas De Informação', 'Teatro', 'Turismo', 'Zootecnia');--> statement-breakpoint
CREATE TYPE "public"."period" AS ENUM('0', '1', '2', '3', '4', '5', '6', '7', '8');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('participant', 'moderator');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"logos" jsonb,
	"signatures" jsonb,
	"max_signatures" smallint DEFAULT 2 NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"course" "course",
	"registration_id" text,
	"period" "period",
	"role" "role" DEFAULT 'participant' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "participants_registration_id_unique" UNIQUE("registration_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"address" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"is_registration_enabled" boolean DEFAULT false,
	"is_research_enabled" boolean DEFAULT false,
	"is_archived" boolean DEFAULT false,
	"logo_url" text,
	"cover_url" text,
	"thumbnail_url" text,
	"primary_color" text DEFAULT '#3B82F6',
	"secondary_color" text DEFAULT '#60A8FB',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"research_url" text,
	"welcome_message" text,
	"large_logo_url" text
);
--> statement-breakpoint
CREATE TABLE "participant_activities" (
	"participant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"subscribedAt" timestamp DEFAULT now() NOT NULL,
	"joined_at" timestamp,
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "speakers" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text,
	"project_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"public_email" text NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"date_from" timestamp NOT NULL,
	"date_to" timestamp NOT NULL,
	"audience" "audience" DEFAULT 'internal' NOT NULL,
	"category" "category" DEFAULT 'other' NOT NULL,
	"participants_limit" integer,
	"tolerance" integer,
	"workload" integer,
	"project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"address" text,
	"latitude" double precision,
	"longitude" double precision,
	"banner_url" text
);
--> statement-breakpoint
CREATE TABLE "speaker_activities" (
	"activity_id" uuid NOT NULL,
	"speaker_id" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_token_participant_id_activity_id_pk" PRIMARY KEY("token","participant_id","activity_id"),
	CONSTRAINT "certificates_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant_activities" ADD CONSTRAINT "participant_activities_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "participant_activities" ADD CONSTRAINT "participant_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "speakers" ADD CONSTRAINT "speakers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "speaker_activities" ADD CONSTRAINT "speakers_on_activities_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "speaker_activities" ADD CONSTRAINT "speakers_on_activities_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_index" ON "accounts" USING btree ("provider" text_ops,"provider_account_id" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "participants_user_id_project_id_index" ON "participants" USING btree ("user_id" uuid_ops,"project_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "participant_activities_participant_id_activity_id_index" ON "participant_activities" USING btree ("participant_id" uuid_ops,"activity_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_index" ON "users" USING btree ("email" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_token_index" ON "certificates" USING btree ("token" uuid_ops);