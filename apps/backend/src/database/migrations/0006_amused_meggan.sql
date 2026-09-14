CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`type` text NOT NULL,
	`direction` text NOT NULL,
	`quantity` integer NOT NULL,
	`stock_before` integer NOT NULL,
	`stock_after` integer NOT NULL,
	`sale_id` integer,
	`request_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stock_movements_product_id_idx` ON `stock_movements` (`product_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_created_at_idx` ON `stock_movements` (`created_at`);--> statement-breakpoint
CREATE INDEX `stock_movements_sale_id_idx` ON `stock_movements` (`sale_id`);