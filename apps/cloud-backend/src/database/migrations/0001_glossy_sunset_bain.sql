CREATE TABLE "login_failed_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ip_address" varchar(64) NOT NULL,
	"failed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "login_failed_attempts_ip_failed_at_idx" ON "login_failed_attempts" USING btree ("ip_address","failed_at");