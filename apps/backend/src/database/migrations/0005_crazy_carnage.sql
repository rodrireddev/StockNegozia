ALTER TABLE `devices` ADD `is_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pairing_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`verification_code_hash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`device_id` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`confirmed_at` integer,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_pairing_sessions`("id", "token_hash", "verification_code_hash", "status", "device_id", "expires_at", "created_at", "confirmed_at") SELECT "id", "token_hash", "verification_code_hash", "status", "device_id", "expires_at", "created_at", "confirmed_at" FROM `pairing_sessions`;--> statement-breakpoint
DROP TABLE `pairing_sessions`;--> statement-breakpoint
ALTER TABLE `__new_pairing_sessions` RENAME TO `pairing_sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;