# Purchases — compras e ingreso de mercadería

## Propósito

Antes de este milestone, la única forma de aumentar `products.stock` era un ajuste manual
(`POST /products/:id/stock-adjustments`, tipo `ADJUSTMENT`) — pensado para corregir el stock
registrado cuando no coincide con la realidad ("conteo físico: 100 → 97"), no para representar la
operación comercial de comprar mercadería a un proveedor. Este milestone agrega `Purchases`: un
módulo que registra esa compra y, en el mismo paso, hace ingresar la mercadería al inventario.

**No confundir `Purchase` con `Stock Adjustment`** — representan intenciones de negocio distintas,
aunque ambas terminan escribiendo stock a través del mismo mecanismo (`adjustStock()`):

| | Significa | `stock_movement.type` |
| --- | --- | --- |
| `Stock Adjustment` | "El stock registrado no coincide con la realidad, lo corrijo." | `ADJUSTMENT` |
| `Purchase` | "Compré mercadería a un proveedor." | `PURCHASE` |

## Alcance de esta primera versión

Una compra es, deliberadamente, una operación simple de un solo paso:

```
Crear compra → Compra registrada → Mercadería ingresa inmediatamente al stock
```

No existen todavía (fuera de alcance explícito de este milestone): órdenes de compra, compras
pendientes, recepción separada/parcial, estados, workflow de aprobación, edición ni cancelación de
una compra ya creada, devolución a proveedor, pagos/cuenta corriente, múltiples monedas, impuestos
o descuentos complejos, costo promedio/FIFO/LIFO, valorización de inventario, ni reportes o
estadísticas de proveedores. **Una compra creada es inmutable** — no hay `PUT`/`PATCH
/purchases/:id`. Corregirla (cancelación, devolución, nota de crédito) requeriría, en un futuro
milestone, una operación explícita nueva — no una edición retroactiva, por la misma razón que
`stock_movements` es append-only (ver STOCK_MOVEMENTS.md).

## Suppliers — estructura mínima

`suppliers` es la estructura mínima necesaria para poder asociar una compra a un proveedor: `id`,
`name`, `createdAt` (sin `updatedAt` — mismo criterio que `categories`, una entidad de referencia
simple, no editable en este milestone). Sin contactos múltiples, direcciones, cuenta corriente,
impuestos, condiciones de pago ni historial — eso queda fuera de alcance hasta que exista una
necesidad real. `SuppliersModule` expone `GET /suppliers`, `GET /suppliers/:id` y
`POST /suppliers`, y es importado por `PurchasesModule` (no al revés) para que
`PurchasesService.create()` pueda validar la existencia del proveedor.

## Modelo de datos

```
suppliers                 purchases                  purchase_items
─────────                 ─────────                  ──────────────
id                         id                          id
name                        supplier_id  ───────────►  purchase_id ──► purchases.id
created_at                  total                       product_id  ──► products.id
                             created_at                  quantity
                                                          unit_cost
                                                          subtotal
```

`purchases.total` y `purchase_items.subtotal` son montos calculados por el backend, nunca
confiados del cliente — de hecho, `createPurchaseSchema` (Zod) ni siquiera declara un campo
`total` en el contrato de request, así que si el cliente lo envía, se descarta silenciosamente al
validar. La fuente de verdad es siempre `purchase_items`: `subtotal = quantity × unitCost` por
item, `total = Σ subtotal`.

Igual que `products.purchasePrice`/`salePrice` y los montos de `Sales`, los costos se representan
como `real` (float de JS) redondeado con el mismo helper `roundMoney()` que ya usa `SalesService`
— no se introdujo ninguna librería monetaria nueva ni una representación en enteros/centavos,
siguiendo la convención ya establecida en el proyecto.

## Relación con Stock Movements: `purchaseId`

`docs/inventory/STOCK_MOVEMENTS.md` ya anticipaba esta decisión: en vez de introducir un patrón
`referenceType`/`referenceId` polimórfico, se agrega una columna específica más,
`stock_movements.purchase_id`, con el mismo criterio que `sale_id` — una FK real y nullable hacia
`purchases.id`. Un movimiento `PURCHASE` siempre tiene `purchaseId` seteado y `saleId` nulo; a la
inversa para `SALE`/`SALE_CANCELLATION`; `ADJUSTMENT` no tiene ninguno de los dos.

Se agregó también `"PURCHASE"` al enum de `stock_movements.type` (junto a `SALE`,
`SALE_CANCELLATION`, `ADJUSTMENT`) y `purchaseId?: number` a `AdjustStockOptions` — la opción que
ya recibía `ProductsService.adjustStock()` para `saleId`/`reason`. No se creó ningún mecanismo
paralelo de escritura de stock.

## Flujo de creación y atomicidad

`PurchasesService.create()` sigue exactamente el mismo patrón transaccional que
`SalesService.create()` (mismo `DrizzleExecutor`/`db.transaction()`):

```
POST /purchases
      │
      ├── valida (Zod): supplierId, items ≥ 1, quantity entero > 0, unitCost ≥ 0,
      │                  sin productId repetido dentro de la compra
      ├── valida en el service (defensa en profundidad, igual que el `reason`
      │   obligatorio de ADJUSTMENT): duplicados + invariantes de cantidad/costo,
      │   ANTES de abrir la transacción
      ▼
BEGIN TRANSACTION
      ├── valida proveedor (SuppliersService.findById, con el `tx` en curso)
      ├── valida cada producto (ProductsService.findById, con el mismo `tx`)
      ├── calcula subtotal por item y total de la compra
      ├── INSERT purchases            → obtiene purchaseId
      ├── INSERT purchase_items
      └── por cada item:
            ProductsService.adjustStock(+quantity, tx, { type: "PURCHASE", purchaseId })
                  ├── UPDATE products.stock
                  └── INSERT stock_movements (type=PURCHASE, direction=IN, purchaseId)
COMMIT (o ROLLBACK completo si cualquier paso anterior lanza)
```

Si falla la validación de un producto posterior (o cualquier otro paso) después de que ya se
ajustó el stock de un producto anterior dentro del mismo loop, SQLite revierte la transacción
completa: no queda purchase, no quedan purchase_items, no queda ningún stock modificado ni ningún
`stock_movement` huérfano — ver `purchases-stock-movements.spec.ts` (`describe("atomicidad")`)
para el test que ejercita exactamente este caso.

### Por qué se rechazan productos duplicados (a diferencia de Sales)

`SalesService` normaliza items duplicados sumando sus cantidades en una sola línea. `Purchases`
adopta la política opuesta — **rechaza** la compra si el mismo `productId` aparece más de una vez
— porque, a diferencia de una venta (un único `unitPrice` por producto, tomado de
`products.salePrice`), cada item de compra trae su propio `unitCost` explícito: dos líneas del
mismo producto con costos distintos serían ambiguas sobre a qué costo corresponde cada unidad. Se
valida antes de iniciar cualquier modificación de stock, tanto en el schema Zod
(`createPurchaseSchema`, vía `.refine()`) como en el service (`assertNoDuplicateProducts()`), para
proteger el invariante también en llamadas que no pasen por HTTP.

## Logging

Mismos eventos de negocio que Sales, adaptados: `purchase.create.started` →
`transaction.started` → (por item) `stock.adjust.started` → `stock.movement.created` →
`stock.adjust.completed` → `transaction.committed` → `purchase.create.completed`, o
`transaction.rollback` → `purchase.create.failed` ante cualquier error. Todos correlacionados por
el mismo `requestId` de `RequestContext` — igual que Sales, `StockMovementsService.record()` nunca
recibe el `requestId` como parámetro explícito. El log de alto nivel de la compra no duplica los
items completos (costos incluidos) — solo `supplierId`/`itemCount`; el detalle de cada item queda
en `purchase_items` y en su propio `stock_movement`, no en el log.

## API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/suppliers` | Lista proveedores (orden alfabético). |
| `GET` | `/suppliers/:id` | Un proveedor por id — 404 si no existe. |
| `POST` | `/suppliers` | Crea un proveedor (`{ name }`). |
| `GET` | `/purchases` | Lista compras (más reciente primero), con `supplierName` ya resuelto. |
| `GET` | `/purchases/:id` | Una compra con sus items — 404 si no existe. |
| `POST` | `/purchases` | Crea una compra (`{ supplierId, items: [{ productId, quantity, unitCost }] }`). |

No hay `PATCH`/`DELETE` sobre `/purchases/:id` en este milestone (ver §Alcance).
