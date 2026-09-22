import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

/**
 * Movimiento de efectivo de caja que NO corresponde a ninguna venta ni compra — típicamente un
 * retiro para pagar una deuda o a un empleado, o un ingreso de capital propio. A diferencia de
 * `stock_movements`, no toca ningún producto ni stock: es puramente un movimiento de plata. Se
 * combina con las ventas en "Ganancias" (ver `features/profits`) para mostrar el resultado neto
 * real, pero se guarda en su propia tabla — nunca se mezcla con `sale_items`, que sigue
 * representando exclusivamente el margen de cada venta.
 */
export const cashAdjustments = sqliteTable(
  "cash_adjustments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    direction: text("direction", { enum: ["IN", "OUT"] }).notNull(),
    // Siempre positivo — la dirección es un campo separado (mismo criterio que stock_movements.quantity).
    amount: real("amount").notNull(),
    // Obligatorio siempre — a diferencia de un ADJUSTMENT de stock (donde el motivo es opcional a
    // nivel de columna y obligatorio solo a nivel de aplicación), acá no hay ningún caso de uso
    // donde tenga sentido un movimiento de caja sin motivo.
    reason: text("reason").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    createdAtIdx: index("cash_adjustments_created_at_idx").on(table.createdAt),
  }),
);
