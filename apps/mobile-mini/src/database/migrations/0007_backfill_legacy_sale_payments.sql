-- Ventas registradas antes de que existieran los medios de pago (0005): no tienen ninguna fila en
-- `sale_payments`, así que al actualizar la app quedaban fuera de "Cobrado" y del desglose por
-- medio. Se les asigna un único pago "Otro" por el total — el medio real no se conoce.
INSERT INTO `sale_payments` (`sale_id`, `method`, `amount`)
SELECT `sales`.`id`, 'other', `sales`.`total`
FROM `sales`
WHERE NOT EXISTS (SELECT 1 FROM `sale_payments` WHERE `sale_payments`.`sale_id` = `sales`.`id`);
