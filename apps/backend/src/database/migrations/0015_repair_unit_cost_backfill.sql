-- Repite el backfill de `0014_fixed_mystique.sql` para instalaciones donde, por el motivo que
-- sea (estado previo de esa base al momento de esa migración), el UPDATE no haya dejado su efecto
-- en los datos reales aunque la migración haya quedado marcada como aplicada. Es idempotente: sólo
-- toca filas que sigan en 0, así que en una base donde 0014 sí funcionó, este archivo no cambia
-- nada.
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
