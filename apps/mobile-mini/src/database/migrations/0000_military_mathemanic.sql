CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`sku` text NOT NULL,
	`barcode` text,
	`description` text,
	`category_id` integer,
	`purchase_price` real DEFAULT 0 NOT NULL,
	`sale_price` real DEFAULT 0 NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`minimum_stock` integer DEFAULT 0 NOT NULL,
	`image` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_barcode_unique` ON `products` (`barcode`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` real NOT NULL,
	`subtotal` real NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sale_items_sale_id_idx` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE INDEX `sale_items_product_id_idx` ON `sale_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`total` real NOT NULL,
	`created_at` integer NOT NULL,
	`cancelled_at` integer
);
--> statement-breakpoint
CREATE INDEX `sales_status_idx` ON `sales` (`status`);--> statement-breakpoint
CREATE INDEX `sales_created_at_idx` ON `sales` (`created_at`);--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_cost` real NOT NULL,
	`subtotal` real NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `purchase_items_purchase_id_idx` ON `purchase_items` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `purchase_items_product_id_idx` ON `purchase_items` (`product_id`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`supplier_name` text NOT NULL,
	`total` real NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `purchases_supplier_id_idx` ON `purchases` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `purchases_created_at_idx` ON `purchases` (`created_at`);--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`type` text NOT NULL,
	`direction` text NOT NULL,
	`quantity` integer NOT NULL,
	`stock_before` integer NOT NULL,
	`stock_after` integer NOT NULL,
	`sale_id` integer,
	`purchase_id` integer,
	`reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stock_movements_product_id_idx` ON `stock_movements` (`product_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_created_at_idx` ON `stock_movements` (`created_at`);--> statement-breakpoint
CREATE INDEX `stock_movements_sale_id_idx` ON `stock_movements` (`sale_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_purchase_id_idx` ON `stock_movements` (`purchase_id`);