ALTER TABLE `sale_payments` ADD `surcharge_percent` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sale_payments` ADD `surcharge_amount` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sale_payments` ADD `fee_percent` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sale_payments` ADD `fee_amount` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sale_payments` ADD `settlement_date` integer;--> statement-breakpoint
CREATE INDEX `sale_payments_settlement_date_idx` ON `sale_payments` (`settlement_date`);