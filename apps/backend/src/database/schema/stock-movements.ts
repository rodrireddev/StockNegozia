import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { products } from "./products";
import { sales } from "./sales";
import { purchases } from "./purchases";
import { devices } from "./devices";

/**
 * Historial auditable de modificaciones de stock — ver docs/inventory/STOCK_MOVEMENTS.md.
 * `products.stock` sigue siendo la única fuente de verdad del estado actual; esta tabla es
 * append-only (nunca se edita ni se borra un movimiento — una cancelación genera uno nuevo).
 *
 * `saleId` es una FK específica hacia `sales`, no un par genérico `referenceType`/`referenceId`:
 * es la única entidad que necesita referenciarse en este milestone, y una FK real es más simple
 * que introducir el primer patrón de referencia polimórfica del proyecto (ver
 * docs/inventory/STOCK_MOVEMENTS.md §Relación con Sales para el razonamiento completo).
 */
export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    type: text("type", { enum: ["SALE", "SALE_CANCELLATION", "ADJUSTMENT", "PURCHASE"] }).notNull(),
    direction: text("direction", { enum: ["IN", "OUT"] }).notNull(),
    // Siempre positiva — la dirección es un campo separado (nunca +3/-3 acá).
    quantity: integer("quantity").notNull(),
    stockBefore: integer("stock_before").notNull(),
    stockAfter: integer("stock_after").notNull(),
    saleId: integer("sale_id").references(() => sales.id),
    // FK específica hacia purchases, mismo criterio que saleId (no referenceType/referenceId
    // polimórfico) — ver docs/inventory/PURCHASES.md. Nullable: solo la usan movimientos PURCHASE.
    purchaseId: integer("purchase_id").references(() => purchases.id),
    // Nullable: un movimiento puede ocurrir fuera de un contexto HTTP (ver RequestContext).
    requestId: text("request_id"),
    // Nullable a nivel de columna (SALE/SALE_CANCELLATION no lo usan, y los movimientos
    // históricos anteriores a este campo no lo tienen) — pero obligatorio a nivel de aplicación
    // para ADJUSTMENT (validado en ProductsService.adjustStock(), no acá).
    reason: text("reason"),
    // Trazabilidad de quién originó el movimiento — ver docs/inventory/STOCK_MOVEMENTS.md
    // §Trazabilidad de actor/dispositivo. Se resuelve siempre desde `RequestContext` (poblado por
    // `ApiAccessGuard` al autenticar), NUNCA de un campo enviado por el cliente. Nullable: no hay
    // dispositivo autenticado en `API_ACCESS_MODE=development`, fuera de un contexto HTTP, o en
    // movimientos anteriores a este campo.
    deviceId: text("device_id").references(() => devices.id),
    // `deviceName`/`deviceType` son un snapshot del dispositivo en el momento del movimiento, no
    // un valor resuelto por JOIN contra `devices` en cada lectura — a diferencia de `unitValue`
    // (que sí se resuelve por JOIN porque `sale_items`/`purchase_items` son inmutables), el nombre
    // de un dispositivo SÍ puede cambiar (`PATCH /auth/devices/:id`), y un movimiento histórico no
    // debe "reescribirse" si el dispositivo se renombra después.
    deviceName: text("device_name"),
    deviceType: text("device_type", { enum: ["desktop", "mobile", "tablet", "web", "other"] }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    productIdIdx: index("stock_movements_product_id_idx").on(table.productId),
    createdAtIdx: index("stock_movements_created_at_idx").on(table.createdAt),
    saleIdIdx: index("stock_movements_sale_id_idx").on(table.saleId),
    purchaseIdIdx: index("stock_movements_purchase_id_idx").on(table.purchaseId),
    deviceIdIdx: index("stock_movements_device_id_idx").on(table.deviceId),
  }),
);
