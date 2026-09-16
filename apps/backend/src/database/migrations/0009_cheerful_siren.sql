ALTER TABLE `stock_movements` ADD `device_id` text REFERENCES devices(id);--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `device_name` text;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `device_type` text;--> statement-breakpoint
CREATE INDEX `stock_movements_device_id_idx` ON `stock_movements` (`device_id`);