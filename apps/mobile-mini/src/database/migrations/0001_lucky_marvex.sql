ALTER TABLE `sale_items` ADD `unit_cost` real DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE `sale_items`
SET `unit_cost` = COALESCE(
  (
    SELECT `purchase_items`.`unit_cost`
    FROM `purchase_items`
    JOIN `purchases` ON `purchases`.`id` = `purchase_items`.`purchase_id`
    JOIN `sales` ON `sales`.`id` = `sale_items`.`sale_id`
    WHERE `purchase_items`.`product_id` = `sale_items`.`product_id`
      AND `purchases`.`created_at` <= `sales`.`created_at`
    ORDER BY `purchases`.`created_at` DESC
    LIMIT 1
  ),
  (SELECT `purchase_price` FROM `products` WHERE `products`.`id` = `sale_items`.`product_id`)
)
WHERE `unit_cost` = 0;