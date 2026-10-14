/**
 * Tope de cualquier monto que el sistema acepta (999.999.999.999,99) — precios, costos, pagos,
 * ajustes de caja. Por debajo de `Number.MAX_SAFE_INTEGER / 100`, así que redondear a centavos
 * sigue siendo exacto incluso sumando muchas líneas de este tamaño. Compartido por validación
 * (zod) y por los campos de monto de cada app (`formatMoneyInputText` en `@stocknegozia/shared`).
 */
export const MAX_MONEY_AMOUNT = 999_999_999_999.99;

/** Tope de unidades de un producto en una sola línea de venta/compra/ajuste de stock. */
export const MAX_ITEM_QUANTITY = 1_000_000;
