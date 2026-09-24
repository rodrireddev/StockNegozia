CREATE TYPE "public"."user_level" AS ENUM('bronze', 'silver', 'gold', 'pro');--> statement-breakpoint
CREATE TYPE "public"."account_token_purpose" AS ENUM('email_verification', 'password_reset');--> statement-breakpoint
CREATE TYPE "public"."credit_reason" AS ENUM('welcome_bonus', 'setup_quest', 'streak_milestone', 'daily_mission', 'rewarded_ad', 'referral_bonus', 'cofounder_grant', 'export_report', 'cloud_backup_subscription', 'remove_ads_subscription', 'feature_request_create', 'feature_request_vote', 'admin_adjustment');--> statement-breakpoint
CREATE TYPE "public"."setup_quest_key" AS ENUM('first_product', 'first_sale', 'first_scan', 'profile_complete');--> statement-breakpoint
CREATE TYPE "public"."daily_mission_key" AS ENUM('register_3_sales', 'update_5_products_stock');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('pending', 'validated', 'expired');--> statement-breakpoint
CREATE TYPE "public"."entitlement_type" AS ENUM('cloud_backup', 'remove_ads');--> statement-breakpoint
CREATE TYPE "public"."feature_request_status" AS ENUM('submitted', 'in_evaluation', 'planned', 'done', 'declined');--> statement-breakpoint
CREATE TYPE "public"."credit_config_item_category" AS ENUM('source', 'sink');--> statement-breakpoint
CREATE TYPE "public"."credit_config_item_unit" AS ENUM('credits', 'count', 'minutes', 'days');--> statement-breakpoint
CREATE TYPE "public"."ad_platform" AS ENUM('android', 'ios', 'desktop');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"phone" text,
	"display_name" text,
	"password_hash" text,
	"email_verified_at" timestamp,
	"level" "user_level" DEFAULT 'bronze' NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"last_active_date" date,
	"referral_code" text NOT NULL,
	"referred_by_user_id" uuid,
	"is_cofounder" boolean DEFAULT false NOT NULL,
	"cofounder_number" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code"),
	CONSTRAINT "users_cofounder_number_unique" UNIQUE("cofounder_number")
);
--> statement-breakpoint
CREATE TABLE "account_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "account_token_purpose" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "account_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" "credit_reason" NOT NULL,
	"reason_metadata" jsonb,
	"idempotency_key" text,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "credit_ledger_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "streak_milestone_claims" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"milestone_day" integer NOT NULL,
	"credits_awarded" integer NOT NULL,
	"claimed_at" timestamp NOT NULL,
	CONSTRAINT "streak_milestone_claims_user_id_milestone_day_unique" UNIQUE("user_id","milestone_day")
);
--> statement-breakpoint
CREATE TABLE "setup_quest_completions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"quest_key" "setup_quest_key" NOT NULL,
	"credits_awarded" integer NOT NULL,
	"completed_at" timestamp NOT NULL,
	CONSTRAINT "setup_quest_completions_user_id_quest_key_unique" UNIQUE("user_id","quest_key")
);
--> statement-breakpoint
CREATE TABLE "daily_mission_completions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"mission_key" "daily_mission_key" NOT NULL,
	"activity_date" date NOT NULL,
	"credits_awarded" integer NOT NULL,
	"completed_at" timestamp NOT NULL,
	CONSTRAINT "daily_mission_completions_user_id_activity_date_unique" UNIQUE("user_id","activity_date")
);
--> statement-breakpoint
CREATE TABLE "rewarded_ad_views" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"sequence_in_day" integer NOT NULL,
	"credits_awarded" integer NOT NULL,
	"viewed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"referrer_user_id" uuid NOT NULL,
	"referred_user_id" uuid NOT NULL,
	"status" "referral_status" DEFAULT 'pending' NOT NULL,
	"credits_awarded_referrer" integer,
	"credits_awarded_referred" integer,
	"validated_at" timestamp,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "referrals_referred_user_id_unique" UNIQUE("referred_user_id")
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "entitlement_type" NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "entitlements_user_id_type_unique" UNIQUE("user_id","type")
);
--> statement-breakpoint
CREATE TABLE "feature_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "feature_request_status" DEFAULT 'submitted' NOT NULL,
	"credits_spent_to_create" integer NOT NULL,
	"total_vote_weight" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_votes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"feature_request_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"vote_number" integer NOT NULL,
	"credits_spent" integer NOT NULL,
	"weight" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "feature_votes_feature_request_id_user_id_vote_number_unique" UNIQUE("feature_request_id","user_id","vote_number")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "credit_config_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"category" "credit_config_item_category" NOT NULL,
	"unit" "credit_config_item_unit" DEFAULT 'credits' NOT NULL,
	"value" integer NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by_admin_id" uuid,
	CONSTRAINT "credit_config_items_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "credit_config_item_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"item_id" uuid NOT NULL,
	"previous_value" integer NOT NULL,
	"new_value" integer NOT NULL,
	"note" text,
	"changed_by_admin_id" uuid NOT NULL,
	"changed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_placements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"platform" "ad_platform" NOT NULL,
	"ad_network" text NOT NULL,
	"ad_unit_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by_admin_id" uuid,
	CONSTRAINT "ad_placements_key_platform_unique" UNIQUE("key","platform")
);
--> statement-breakpoint
CREATE TABLE "ad_placement_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"placement_id" uuid NOT NULL,
	"previous_ad_network" text NOT NULL,
	"new_ad_network" text NOT NULL,
	"previous_ad_unit_id" text NOT NULL,
	"new_ad_unit_id" text NOT NULL,
	"previous_enabled" boolean NOT NULL,
	"new_enabled" boolean NOT NULL,
	"note" text,
	"changed_by_admin_id" uuid NOT NULL,
	"changed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ad_reward_callbacks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"transaction_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"ad_network" text DEFAULT 'admob' NOT NULL,
	"ad_unit" text NOT NULL,
	"reward_item" text NOT NULL,
	"reward_amount" integer NOT NULL,
	"verified_at" timestamp NOT NULL,
	"credit_ledger_entry_id" uuid,
	CONSTRAINT "ad_reward_callbacks_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "house_ads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"image_url" text,
	"cta_label" text NOT NULL,
	"cta_url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"updated_by_admin_id" uuid
);
--> statement-breakpoint
CREATE TABLE "house_ad_impressions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"house_ad_id" uuid NOT NULL,
	"user_id" uuid,
	"shown_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_user_id_users_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_tokens" ADD CONSTRAINT "account_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streak_milestone_claims" ADD CONSTRAINT "streak_milestone_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "setup_quest_completions" ADD CONSTRAINT "setup_quest_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_mission_completions" ADD CONSTRAINT "daily_mission_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewarded_ad_views" ADD CONSTRAINT "rewarded_ad_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_requests" ADD CONSTRAINT "feature_requests_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_votes" ADD CONSTRAINT "feature_votes_feature_request_id_feature_requests_id_fk" FOREIGN KEY ("feature_request_id") REFERENCES "public"."feature_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_votes" ADD CONSTRAINT "feature_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_config_items" ADD CONSTRAINT "credit_config_items_updated_by_admin_id_admin_users_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_config_item_revisions" ADD CONSTRAINT "credit_config_item_revisions_item_id_credit_config_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."credit_config_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_config_item_revisions" ADD CONSTRAINT "credit_config_item_revisions_changed_by_admin_id_admin_users_id_fk" FOREIGN KEY ("changed_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_placements" ADD CONSTRAINT "ad_placements_updated_by_admin_id_admin_users_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_placement_revisions" ADD CONSTRAINT "ad_placement_revisions_placement_id_ad_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."ad_placements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_placement_revisions" ADD CONSTRAINT "ad_placement_revisions_changed_by_admin_id_admin_users_id_fk" FOREIGN KEY ("changed_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_reward_callbacks" ADD CONSTRAINT "ad_reward_callbacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_reward_callbacks" ADD CONSTRAINT "ad_reward_callbacks_credit_ledger_entry_id_credit_ledger_id_fk" FOREIGN KEY ("credit_ledger_entry_id") REFERENCES "public"."credit_ledger"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_ads" ADD CONSTRAINT "house_ads_updated_by_admin_id_admin_users_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_ad_impressions" ADD CONSTRAINT "house_ad_impressions_house_ad_id_house_ads_id_fk" FOREIGN KEY ("house_ad_id") REFERENCES "public"."house_ads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "house_ad_impressions" ADD CONSTRAINT "house_ad_impressions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rewarded_ad_views_user_viewed_at_idx" ON "rewarded_ad_views" USING btree ("user_id","viewed_at");