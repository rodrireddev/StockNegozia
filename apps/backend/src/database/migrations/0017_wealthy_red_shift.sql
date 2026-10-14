CREATE TABLE `sale_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`method` text NOT NULL,
	`amount` real NOT NULL,
	`installments` integer,
	`card_brand` text,
	`reference` text,
	`amount_received` real,
	`change` real,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sale_payments_sale_id_idx` ON `sale_payments` (`sale_id`);--> statement-breakpoint
CREATE INDEX `sale_payments_method_idx` ON `sale_payments` (`method`);