CREATE TABLE `pairing_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`verification_code_hash` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`device_id` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`confirmed_at` integer
);
