CREATE TABLE `gamification_outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`metric_type` text,
	`quest_key` text,
	`occurred_on` text,
	`created_at` integer NOT NULL,
	`synced_at` integer
);
--> statement-breakpoint
CREATE INDEX `gamification_outbox_synced_at_idx` ON `gamification_outbox` (`synced_at`);