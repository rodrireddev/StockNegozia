CREATE TYPE "public"."activity_metric_type" AS ENUM('sale_completed', 'stock_adjustment_in', 'stock_adjustment_out', 'purchase_registered', 'cash_adjustment_in', 'cash_adjustment_out', 'product_created', 'product_scanned', 'supplier_created', 'rewarded_ad_viewed');--> statement-breakpoint
CREATE TYPE "public"."achievement_category" AS ENUM('setup_quest', 'streak_milestone', 'scheduled_goal');--> statement-breakpoint
CREATE TYPE "public"."achievement_schedule_type" AS ENUM('once', 'streak', 'daily', 'weekly', 'monthly', 'specific_date');--> statement-breakpoint
ALTER TYPE "public"."credit_reason" RENAME VALUE 'daily_mission' TO 'scheduled_goal';--> statement-breakpoint
DROP TABLE "streak_milestone_claims";--> statement-breakpoint
DROP TABLE "setup_quest_completions";--> statement-breakpoint
DROP TABLE "daily_mission_completions";--> statement-breakpoint
DROP TYPE "public"."setup_quest_key";--> statement-breakpoint
DROP TYPE "public"."daily_mission_key";--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"metric_type" "activity_metric_type" NOT NULL,
	"occurred_on" date NOT NULL,
	"client_event_id" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "activity_events_user_id_metric_type_client_event_id_unique" UNIQUE("user_id","metric_type","client_event_id")
);
--> statement-breakpoint
CREATE TABLE "achievement_definitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"category" "achievement_category" NOT NULL,
	"metric_type" "activity_metric_type",
	"target" integer,
	"schedule_type" "achievement_schedule_type" NOT NULL,
	"schedule_config" jsonb,
	"credits_awarded" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by_admin_id" uuid,
	CONSTRAINT "achievement_definitions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "achievement_definition_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"achievement_definition_id" uuid NOT NULL,
	"previous_label" text NOT NULL,
	"new_label" text NOT NULL,
	"previous_description" text,
	"new_description" text,
	"previous_target" integer,
	"new_target" integer,
	"previous_schedule_type" "achievement_schedule_type" NOT NULL,
	"new_schedule_type" "achievement_schedule_type" NOT NULL,
	"previous_schedule_config" jsonb,
	"new_schedule_config" jsonb,
	"previous_credits_awarded" integer NOT NULL,
	"new_credits_awarded" integer NOT NULL,
	"previous_active" boolean NOT NULL,
	"new_active" boolean NOT NULL,
	"note" text,
	"changed_by_admin_id" uuid NOT NULL,
	"changed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievement_claims" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_definition_id" uuid NOT NULL,
	"period_key" text NOT NULL,
	"credits_awarded" integer NOT NULL,
	"claimed_at" timestamp NOT NULL,
	CONSTRAINT "achievement_claims_user_id_achievement_definition_id_period_key_unique" UNIQUE("user_id","achievement_definition_id","period_key")
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_definitions" ADD CONSTRAINT "achievement_definitions_updated_by_admin_id_admin_users_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_definition_revisions" ADD CONSTRAINT "achievement_definition_revisions_achievement_definition_id_achievement_definitions_id_fk" FOREIGN KEY ("achievement_definition_id") REFERENCES "public"."achievement_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_definition_revisions" ADD CONSTRAINT "achievement_definition_revisions_changed_by_admin_id_admin_users_id_fk" FOREIGN KEY ("changed_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_claims" ADD CONSTRAINT "achievement_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_claims" ADD CONSTRAINT "achievement_claims_achievement_definition_id_achievement_definitions_id_fk" FOREIGN KEY ("achievement_definition_id") REFERENCES "public"."achievement_definitions"("id") ON DELETE no action ON UPDATE no action;
