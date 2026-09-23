CREATE TABLE `cash_adjustments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`direction` text NOT NULL,
	`amount` real NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cash_adjustments_created_at_idx` ON `cash_adjustments` (`created_at`);