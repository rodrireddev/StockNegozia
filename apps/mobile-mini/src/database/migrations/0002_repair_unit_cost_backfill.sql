-- Repite el backfill de `0001_lucky_marvex.sql` para dispositivos donde, por el motivo que sea
-- (build/estado previo del dispositivo), esa migración terminó marcada como aplicada sin que el
-- UPDATE haya dejado su efecto en los datos reales. Es idempotente: sólo toca filas que sigan en
-- 0, así que en un dispositivo donde 0001 sí funcionó, este archivo no cambia nada.
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
