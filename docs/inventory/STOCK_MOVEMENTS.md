# Stock Movements — historial de modificaciones de stock

## Propósito

Antes de este milestone, `products.stock` solo decía **cuánto** stock tiene un producto ahora.
No había forma de responder **cómo llegó** a ese número — ¿fue una venta? ¿una cancelación? ¿un
ajuste manual? `stock_movements` agrega ese historial: un registro append-only de cada
modificación de stock, pensado para auditoría, no para reemplazar nada que ya existía.

Tres responsabilidades claramente separadas, que no se pisan entre sí:

|                   | Responsabilidad                                                                                  | Vive en                          |
| ----------------- | ------------------------------------------------------------------------------------------------ | -------------------------------- |
| `products.stock`  | Estado **actual** del inventario — la única fuente de verdad para "¿cuánto stock hay ahora?".    | SQLite, tabla `products`.        |
| `stock_movements` | Historial **auditable** de cómo se llegó a ese estado — cada modificación, con su antes/después. | SQLite, tabla `stock_movements`. |
| `app.log`         | Diagnóstico **técnico** de la ejecución (errores, duración, trazas de transacción).              | JSONL, `<dataDir>/logs/app.log`. |

Ninguno reemplaza a los otros. `stock_movements` no se puede usar para "reconstruir" el stock
actual sumando/restando todo el historial en cada consulta — sería frágil e innecesario, cuando
`products.stock` ya es la fuente de verdad. `app.log` tampoco es un sustituto de `stock_movements`:
los logs rotan/se pueden borrar y no tienen garantías de índices, consultas ni relaciones — el
historial de negocio necesita vivir en la base de datos transaccional.

## Regla arquitectónica: `ProductsService.adjustStock()` es el único punto de mutación

**Toda modificación efectiva de `products.stock` genera obligatoriamente un `stock_movement`,
dentro de la misma transacción.** No existe (ni debe existir) ninguna vía pública de la API que
permita cambiar el stock evitando el historial — ver §Historia: eliminación de `updateStock()`
más abajo para el caso real que motivó dejar esta regla explícita.

`StockMovementsService` no tiene, y no debe tener nunca, métodos como `increaseStock()`,
`decreaseStock()` o `setStock()` — su responsabilidad es exclusivamente **registrar y consultar**
movimientos ya ocurridos, nunca decidir ni ejecutar el cambio de stock en sí.

```
adjustStock()
    │
    ├── obtener stock actual
    ├── validar cantidad (¿hay suficiente stock?)
    ├── actualizar products.stock (ProductsRepository.adjustStock)
    └── registrar el stock movement (StockMovementsService.record) ── solo si el paso anterior tuvo éxito
```

`StockMovementsService.record()` nunca es responsable de decidir si el cambio de stock es válido
—esa decisión (¿hay stock suficiente?) sigue siendo exclusiva de `ProductsService.adjustStock()`
antes de llamarlo.

## Tipos de movimiento

Esta milestone implementa tres:

| `type`              | `direction`  | Cuándo                                                                                                                                                                                                      |
| ------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SALE`              | `OUT`        | Una venta descuenta stock.                                                                                                                                                                                  |
| `SALE_CANCELLATION` | `IN`         | Se cancela una venta y se restaura el stock.                                                                                                                                                                |
| `ADJUSTMENT`        | `IN` o `OUT` | Cualquier otro ajuste sin un contexto de negocio más específico — es también el valor por defecto cuando `adjustStock()` se llama sin especificar un `type`. Único tipo que exige `reason` (ver §`reason`). |

El campo es un `enum` de texto (`stockMovements.type`, ver schema) — agregar un tipo nuevo en el
futuro (`PURCHASE`, `RETURN`, `TRANSFER`, `DAMAGE`, `LOSS`, `INITIAL_STOCK`, explícitamente **no
implementados en este milestone**) significa únicamente ampliar ese enum y pasar el `type`
correspondiente al llamar `adjustStock()` — no reescribir el módulo. `StockMovementsService` ya es
agnóstico al tipo: solo persiste el valor que recibe.

## Dirección: `IN` / `OUT`, separada de `quantity`

`quantity` siempre es positiva. La dirección es un campo aparte (`direction: "IN" | "OUT"`) — el
módulo nunca representa una salida como `-3` ni una entrada como `+3` en `quantity`.
`StockMovementsService.record()` rechaza (`BadRequestException`) cualquier intento de registrar un
movimiento con `quantity <= 0`, exactamente para no permitir que esa convención se rompa por error.

```
20 → 17   (venta de 3)        stockBefore=20  quantity=3  direction=OUT  stockAfter=17
17 → 20   (cancelación)       stockBefore=17  quantity=3  direction=IN   stockAfter=20
```

## `stockBefore` / `stockAfter`

Obligatorios en cada movimiento — permiten auditar una operación puntual sin tener que sumar/restar
todo el historial previo del producto. `ProductsService.adjustStock()` lee el stock actual del
producto (`stockBefore`) antes de aplicar el cambio, y vuelve a leerlo (`stockAfter`) después de
que `ProductsRepository.adjustStock()` confirma que se aplicó.

## `requestId`

Nullable. Se obtiene siempre de `RequestContext.getRequestId()` (mismo mecanismo del Milestone 4,
`AsyncLocalStorage`) — `StockMovementsService.record()` nunca genera un requestId nuevo ni lo
recibe como parámetro explícito. Si la operación ocurre fuera de un contexto HTTP (por ejemplo, un
test que llama a `adjustStock()` directamente, o un futuro script de mantenimiento), el valor es
simplemente `null` — el negocio nunca depende de que exista.

Esto permite reconstruir una operación completa a partir de un solo `requestId`:

```
requestId
    ↓
http.request.started
    ↓
sale.create.started
    ↓
transaction.started
    ↓
stock.adjust.started
    ↓
stock.movement.created     ← nuevo en este milestone
    ↓
stock.adjust.completed
    ↓
transaction.committed
    ↓
sale.create.completed
    ↓
http.request.completed
```

(Verificado manualmente contra el backend compilado real — ver informe de la milestone.)

## `reason`

Nullable a nivel de columna (`stock_movements.reason`, migración `0007_useful_marvel_zombies.sql`)
pero **obligatorio a nivel de aplicación para `ADJUSTMENT`** — `SALE`/`SALE_CANCELLATION` nunca lo
usan, y los movimientos creados antes de que este campo existiera quedan con `reason: null` (no se
tocan retroactivamente, ver §Compatibilidad con datos existentes).

La validación vive en `ProductsService.adjustStock()` (no en la columna, que sigue siendo
nullable para no romper `SALE`/`SALE_CANCELLATION` ni el historial previo):

```ts
if (delta !== 0 && type === "ADJUSTMENT" && !options.reason?.trim()) {
  throw new BadRequestException("El motivo del ajuste es obligatorio");
}
```

Se valida **antes** de tocar `ProductsRepository.adjustStock()` — un `ADJUSTMENT` sin motivo nunca
llega a escribir `products.stock`, ni siquiera dentro de una transacción que luego revertiría. La
misma regla también se aplica en el límite HTTP (`stockAdjustmentSchema`, Zod: string no vacío,
sin espacios en blanco solamente, máximo 200 caracteres) — dos capas, mismo criterio.

No se considera secreto: aparece en la respuesta (`StockMovementDto.reason`) y en el log
`stock.movement.created` sin restricciones, igual que `productId`/`type`/`quantity`.

## Relación con Sales: `saleId`

El movimiento necesita poder responder dos preguntas: _¿qué venta produjo este movimiento?_ y
_¿qué movimiento restauró el stock cuando se canceló esa venta?_ — ambas se resuelven con un único
campo: `stock_movements.sale_id`, una Foreign Key real hacia `sales.id` (nullable — `ADJUSTMENT` no
tiene venta asociada).

**Por qué una FK específica y no un par genérico `referenceType`/`referenceId`**: en este milestone
`sales` es la única entidad que necesita referenciarse desde un movimiento. Un par genérico
polimórfico habría sido la primera abstracción de ese tipo en todo el proyecto, sin una segunda
necesidad real todavía que la justifique (Purchases/Returns/Transfers están explícitamente fuera de
alcance — ver §Fuera de alcance). Si en una futura milestone se necesita referenciar, por ejemplo,
una compra, la decisión a tomar en ese momento es agregar una columna específica más (`purchaseId`)
o migrar a un patrón genérico — no se adelanta esa decisión ahora.

Tanto el movimiento `SALE` como su eventual `SALE_CANCELLATION` comparten el mismo `saleId` —
consultando por ese id se obtienen ambos.

## Cancelación: nunca se edita el movimiento original

Cancelar una venta **nunca** modifica ni elimina el movimiento `SALE` original. Genera un
movimiento `SALE_CANCELLATION` nuevo, con su propio `stockBefore`/`stockAfter`. `stock_movements`
es estrictamente append-only — no existe, en todo el módulo, ningún método `update()` ni
`delete()` sobre esta tabla.

```
SALE                  stockBefore=20  quantity=3  direction=OUT  stockAfter=17
SALE_CANCELLATION      stockBefore=17  quantity=3  direction=IN   stockAfter=20
```

## Precio histórico (`StockMovementDto.unitValue`)

Un movimiento representa un hecho histórico — el precio que muestra debe ser el de **esa
operación puntual**, nunca el precio _actual_ de `products.purchasePrice`/`salePrice` (que puede
cambiar libremente después, sin que eso deba alterar el pasado). Ejemplo: dos compras del mismo
producto a $700 y $850 deben seguir mostrando esos dos valores aunque hoy el costo de compra del
producto sea $950.

**Decisión de diseño: no se agregó ninguna columna a `stock_movements`.** El valor histórico ya
existe, inmutable, en otro lado:

- `PURCHASE` → `purchase_items.unitCost` (la compra es inmutable — no hay `update`/`delete` sobre
  `purchases`/`purchase_items`, ver docs/inventory/PURCHASES.md).
- `SALE` / `SALE_CANCELLATION` → `sale_items.unitPrice` (snapshot tomado en el momento de la
  venta — ver comentario en `database/schema/sales.ts`). Una cancelación comparte el `saleId` de
  la venta original, así que resuelve al mismo precio.
- `ADJUSTMENT` → no existe: un ajuste manual no es una transacción comercial, no tiene "precio
  pagado" ni "precio cobrado". Se representa como `null`, nunca `0` (`0` significaría "esta unidad
  no valía nada", que es una afirmación distinta a "esta operación no tiene precio").

`StockMovementsRepository.findMany()` resuelve esto con dos `LEFT JOIN` — uno contra `sale_items`
por `(sale_id, product_id)`, otro contra `purchase_items` por `(purchase_id, product_id)` — y
`StockMovementsService` colapsa el que corresponda en un único campo `unitValue: number | null`.
Ambos pares son únicos por construcción (`SalesService.create()` normaliza/suma cantidades
duplicadas antes de insertar `sale_items`; `createPurchaseSchema` rechaza productos repetidos
dentro de una misma compra), así que cada join matchea a lo sumo una fila — nunca hace falta
desambiguar entre varias.

Se evaluó la alternativa de guardar el precio directamente en `stock_movements` (una columna
`unit_value` propia). Se descartó: hubiera significado una migración, duplicar un dato que ya
vive, inmutable, en `sale_items`/`purchase_items`, y el riesgo (aunque remoto, al ser ambas tablas
inmutables) de que las dos copias divergieran. Resolverlo con un join en el momento de leer
consigue exactamente la misma propiedad (el valor nunca cambia después de creado) sin ese costo,
y además funciona retroactivamente: no hizo falta ningún backfill para los movimientos que ya
existían antes de este cambio — sus `sale_items`/`purchase_items` ya estaban ahí desde siempre.

`record()` (el método que inserta un movimiento nuevo) no hace este join — devuelve el `unitValue`
como `null` en su valor de retorno inmediato, porque nada del flujo real usa ese valor de retorno
(`ProductsService.adjustStock()` lo descarta). El valor correcto siempre está disponible a través
de `findMany()`/`findByProduct()`, que es el único camino que efectivamente consume la UI de
Inventario.

## Integración con `ProductsService.adjustStock()`

`adjustStock()` acepta un cuarto parámetro opcional:

```ts
adjustStock(
  id: number,
  delta: number,
  executor?: DrizzleExecutor,
  options: AdjustStockOptions = {},   // { type?: StockMovementType; saleId?: number; reason?: string }
): ProductDto
```

Este sigue siendo el único cambio de firma introducido para esta funcionalidad, y es
deliberadamente mínimo: el método sigue existiendo, sigue llamándose `adjustStock()`, sigue siendo
el único lugar que escribe `products.stock` de forma relativa, y todos los llamadores existentes
que no pasan `options` siguen funcionando exactamente igual — `options.type` cae al default
`"ADJUSTMENT"` (que ahora, si el delta es distinto de cero, exige `reason` — ver §`reason`).

Dentro de `adjustStock()`, después de resolver el producto pero **antes** de tocar
`ProductsRepository.adjustStock()`, se valida el motivo si corresponde; luego, solo si el
repositorio confirma el cambio (si no hay stock suficiente, se lanza `ConflictException` antes de
llegar a este punto y nunca se registra un movimiento):

```ts
if (delta !== 0) {
  this.stockMovementsService.record(
    {
      productId: id,
      type: options.type ?? "ADJUSTMENT",
      direction: delta < 0 ? "OUT" : "IN",
      quantity: Math.abs(delta),
      stockBefore: product.stock,
      stockAfter: updated.stock,
      saleId: options.saleId,
      reason: options.reason,
    },
    executor, // el mismo executor recibido — ver §Atomicidad
  );
}
```

`ProductsModule` importa `StockMovementsModule` (no al revés) para que `ProductsService` pueda
inyectar `StockMovementsService` — el mismo patrón que ya usa para `CategoriesModule`.

## Integración con Sales

`SalesService` es quien decide el `type`/`saleId` — `adjustStock()` no sabe nada de "ventas", solo
recibe el contexto que el llamador le pasa:

```ts
// SalesService.create()
this.productsService.adjustStock(line.productId, -line.quantity, tx, {
  type: "SALE",
  saleId: sale.id,
});

// SalesService.cancel()
this.productsService.adjustStock(item.productId, item.quantity, tx, {
  type: "SALE_CANCELLATION",
  saleId: id,
});
```

Una venta con varios productos genera un movimiento por cada producto — uno por cada llamada a
`adjustStock()` dentro del mismo `for` que ya existía.

## Atomicidad

**El cambio de stock y el movimiento pertenecen siempre a la misma transacción SQLite**, lograda
sin introducir ningún mecanismo nuevo: reutilizando el patrón `DrizzleExecutor` que
`ProductsRepository`/`SalesRepository` ya usaban desde antes de este milestone.

`SalesService.create()`/`cancel()` abren la transacción con `this.db.transaction((tx) => {...})` y
pasan ese mismo `tx` a `adjustStock(..., tx, ...)`. `adjustStock()` reenvía ese `tx` tal cual a
`stockMovementsService.record(data, tx)`, que a su vez lo reenvía a
`StockMovementsRepository.insert(data, tx)`. Las tres escrituras — `sales`/`sale_items`,
`products.stock`, `stock_movements` — terminan ejecutándose contra el mismo `tx` de
`better-sqlite3`, así que si `db.transaction()` revierte (por ejemplo, `ConflictException` de stock
insuficiente en un ítem posterior), revierte **todo**, sin excepción.

```
BEGIN TRANSACTION
    │
    ├── insertSale / insertSaleItems
    ├── adjustStock() → products.stock       (tx)
    └── adjustStock() → stock_movements      (tx, dentro del mismo adjustStock())
    │
COMMIT   (o ROLLBACK completo si cualquier paso falla)
```

No se introdujo ninguna abstracción nueva de transacciones — `adjustStock()` seguía aceptando un
`executor` opcional desde antes; este milestone solo agrega un paso más (`record()`) que reenvía
ese mismo `executor`.

**Verificado explícitamente** (test crítico, `sales-stock-movements.spec.ts` §atomicidad, y
verificación manual contra el backend compilado): una venta multi-producto donde el primer
producto tiene stock suficiente y el segundo no, produce **cero** movimientos persistidos para
**ambos** productos tras el rollback — incluido el primero, cuyo `adjustStock()` se había aplicado
lógicamente (stock actualizado + movimiento "creado" dentro de la transacción) antes de que el
segundo fallara.

`transaction.committed` sigue registrándose únicamente después de que `db.transaction()` retorna
sin lanzar (regla ya existente del Milestone 4/Sales, sin cambios) — nunca se movió ese log hacia
adentro de la transacción.

## Logging

Reutiliza `AppLogger`/`RequestContext` — sin sistema paralelo. Un solo evento nuevo:

| Evento                   | Nivel | Cuándo                                                                                                                                                                                                   |
| ------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stock.movement.created` | DEBUG | Un movimiento se registró exitosamente. Mismo nivel que `stock.adjust.started/completed` (Milestone "Sales") — es ruido de alto volumen en operación normal, silenciado por defecto en `LOG_LEVEL=info`. |

Metadata incluida: `movementId`, `productId`, `type`, `direction`, `quantity`, `stockBefore`,
`stockAfter`, `saleId` (cuando aplica). **Nunca** se registran credentials, `Authorization`,
pairing tokens, verification codes ni ningún secreto — mismo criterio ya vigente en todo el
proyecto (ver `docs/security/API_ACCESS.md`).

No se eliminó ni se reemplazó ningún evento existente
(`stock.adjust.started/completed`, `sale.*.started/completed`, `transaction.*`) — `
stock.movement.created` se intercala entre `stock.adjust.started` y `stock.adjust.completed`,
como un paso más dentro de la misma operación, no como un evento duplicado. Secuencia real
(verificada, tests y manualmente):

```
sale.create.started
transaction.started
stock.adjust.started
stock.movement.created      ← nuevo
stock.adjust.completed
transaction.committed
sale.create.completed
```

## Persistencia y modelo

Tabla `stock_movements` (Drizzle/SQLite, migración `0006_amused_meggan.sql`; `reason` agregado en
`0007_useful_marvel_zombies.sql`):

| Campo          | Tipo                               | Descripción                                                                                   |
| -------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `id`           | integer, PK autoincrement          | Igual convención que `products`/`sales` (no UUID — ese estilo es específico del módulo Auth). |
| `product_id`   | integer, FK → `products.id`        | Obligatorio.                                                                                  |
| `type`         | text enum                          | `SALE` \| `SALE_CANCELLATION` \| `ADJUSTMENT`.                                                |
| `direction`    | text enum                          | `IN` \| `OUT`.                                                                                |
| `quantity`     | integer                            | Siempre positiva.                                                                             |
| `stock_before` | integer                            | Snapshot antes del cambio.                                                                    |
| `stock_after`  | integer                            | Snapshot después del cambio.                                                                  |
| `sale_id`      | integer, FK → `sales.id`, nullable | Ver §Relación con Sales.                                                                      |
| `request_id`   | text, nullable                     | Ver §requestId.                                                                               |
| `reason`       | text, nullable a nivel de columna  | Obligatorio a nivel de aplicación para `ADJUSTMENT` — ver §`reason`.                          |
| `created_at`   | integer (timestamp)                | Fecha de alta — la tabla nunca se actualiza (`updated_at` no existe a propósito).             |

Índices (`stock_movements_product_id_idx`, `stock_movements_created_at_idx`,
`stock_movements_sale_id_idx`) — cubren los patrones de consulta reales (por producto, orden
cronológico, por venta), sin agregar índices especulativos.

## API

Lectura (`StockMovementsController`, sin prefijo de clase para poder exponer ambas formas sin
tocar `ProductsController`):

- `GET /stock-movements?productId=&type=&direction=&from=&to=` — listado global filtrable.
- `GET /products/:productId/stock-movements?type=&direction=&from=&to=` — historial de un
  producto puntual (atajo sobre el mismo servicio).

Ambos devuelven `StockMovementDto[]`, ordenados por fecha descendente (con `id` descendente como
desempate para movimientos que comparten el mismo milisegundo, como los de una venta
multi-producto). Sin paginación — no hay todavía un volumen real que la justifique.

Escritura — un único endpoint, la única forma pública de producir un `ADJUSTMENT`:

- `POST /products/:id/stock-adjustments` — ver §Ajuste manual de stock. Reemplaza a
  `PATCH /products/:id/stock` (eliminado — ver §Historia: eliminación de `updateStock()`).

No hay, ni debe haber, ningún endpoint que escriba `stock_movements` directamente (crear,
editar o eliminar un movimiento) — todo movimiento nace exclusivamente como efecto de
`adjustStock()`.

## Ajuste manual de stock — `POST /products/:id/stock-adjustments`

API semántica para el cliente: recibe el **stock absoluto** deseado (nunca le pide al consumidor
que piense en términos de delta), y el backend calcula internamente el delta y lo aplica vía el
mecanismo canónico:

```
Cliente                          Backend
   │                                │
   │  POST /products/:id/           │
   │  stock-adjustments             │
   │  { stock: 97,                  │
   │    reason: "Conteo físico" }   │
   ├───────────────────────────────►│
   │                                │  stockActual = 100
   │                                │  delta = 97 - 100 = -3
   │                                │
   │                                │  adjustStock(id, -3, tx, {
   │                                │    type: "ADJUSTMENT",
   │                                │    reason: "Conteo físico",
   │                                │  })
   │                                │        │
   │                                │        ├──► products.stock = 97
   │                                │        └──► stock_movement { direction: OUT, quantity: 3, ... }
   │                                │
   │◄───────────────────────────────┤  ProductDto { stock: 97, ... }
```

Implementación (`ProductsService.applyStockAdjustment()`):

```ts
applyStockAdjustment(id: number, targetStock: number, reason: string): ProductDto {
  if (targetStock < 0) throw new BadRequestException("El stock no puede ser negativo");

  const current = this.findById(id); // 404 si no existe
  const delta = targetStock - current.stock;
  if (delta === 0) return current; // sin cambio real: ni transacción, ni movimiento

  return this.db.transaction((tx) =>
    this.adjustStock(id, delta, tx, { type: "ADJUSTMENT", reason }),
  );
}
```

No existe una `StockAdjustmentService`/`StockAdjustmentModule` separada: el cálculo de delta es
una única línea sin responsabilidad propia más allá de traducir "stock absoluto" a "delta", así
que agregar un módulo entero para eso habría sido la sobreingeniería que la especificación de este
cambio pidió explícitamente evitar. Vive en `ProductsService` porque ya es quien posee
`adjustStock()` y `findById()` — no se duplica ninguna lógica.

**Sin llamadas HTTP internas**: `ProductsController` llama directamente a
`productsService.applyStockAdjustment()`, que llama directamente a `this.adjustStock()` (mismo
objeto, mismo proceso) — nunca hay un endpoint invocando a otro por HTTP.

**Caso `delta === 0`**: no se abre transacción, no se toca `products.stock`, no se crea ningún
movimiento — se devuelve el producto tal cual está. Cubierto explícitamente en
`products-stock-adjustment.spec.ts`.

Contrato dedicado (`packages/validation/src/inventory/stock-adjustment.schema.ts`,
`stockAdjustmentSchema`) — deliberadamente **no** reutiliza ningún schema de `Product`:

```ts
{
  stock: number; // entero >= 0, finito — el stock ABSOLUTO deseado
  reason: string; // obligatorio, 1–200 caracteres, no solo espacios
}
```

## Historia: eliminación de `updateStock()` (`PATCH /products/:id/stock`)

Hasta antes de esta corrección, además de `adjustStock()` (relativo) existía
`ProductsService.updateStock()` — un segundo método que escribía `products.stock` con un valor
**absoluto**, expuesto como `PATCH /products/:id/stock` y usado por la UI de ajuste de stock. Ese
método **nunca generaba un `stock_movement`**: era una vía real, pública, para modificar el
inventario sin dejar rastro — la inconsistencia que motivó esta corrección.

**Se eliminó por completo**, en todas las capas, no solo se desconectó del router:

- `ProductsController` — el método `updateStock`/`@Patch(":id/stock")` ya no existe.
- `ProductsService.updateStock()` — eliminado.
- `ProductsRepository.updateStock()` — eliminado (la escritura cruda a `products.stock` que hacía
  posible el bypass).
- `stockUpdateSchema`/`StockUpdateInput` (`packages/validation`) — eliminados.
- UI de Electron/React (`StockAdjustDialog.tsx`) — adaptada al nuevo endpoint (ver
  §UI de Electron/React).

`PATCH /products/:id/stock` hoy devuelve `404 Not Found` — verificado con un test HTTP real
(`products.e2e.spec.ts`, no solo a nivel de servicio) para demostrar que ninguna ruta del router
de Nest sigue respondiendo ahí.

## UI de Electron/React

La UI de ajuste de stock ya existía (`apps/desktop/renderer/src/features/products/components/StockAdjustDialog.tsx`)
antes de esta corrección — se adaptó, no se reescribió:

- Sigue pidiendo el **stock nuevo** (absoluto) — la UI nunca calculó ni calcula un delta, eso
  siempre fue (y sigue siendo) responsabilidad del backend.
- Se agregó un campo **Motivo** (obligatorio) — antes no existía ningún campo de motivo en el
  diálogo, porque el endpoint viejo no lo pedía.
- El hook `useUpdateStock` (llamaba a `PATCH /products/:id/stock`) se reemplazó por
  `useAdjustStock` (llama a `POST /products/:id/stock-adjustments`, con `{ stock, reason }`).
- `products.api.ts`: `updateProductStock()` → `adjustProductStock()`.

No se construyó una pantalla nueva ni un historial visual de movimientos — solo lo estrictamente
necesario para que el diálogo existente hable el nuevo contrato.

## Compatibilidad con datos existentes

Agregar `reason` (migración `0007_useful_marvel_zombies.sql`, `ALTER TABLE ... ADD reason text` —
sin recreación de tabla, sin tocar filas existentes) no invalida ningún movimiento histórico:

- Los movimientos `SALE`/`SALE_CANCELLATION`/`ADJUSTMENT` creados antes de este campo quedan con
  `reason: null` — siguen siendo válidos, consultables, e inmutables (no se editan
  retroactivamente para "rellenar" un motivo que nunca existió).
- Los movimientos `SALE`/`SALE_CANCELLATION` nuevos tampoco lo usan — `reason` es exclusivo del
  flujo de `ADJUSTMENT`.
- Solo los `ADJUSTMENT` creados **desde ahora** exigen `reason` — la obligatoriedad es a nivel de
  aplicación (ver §`reason`), no una constraint `NOT NULL` en la columna, precisamente para no
  romper esta compatibilidad hacia atrás.

## Fuera de alcance de este milestone

No implementado (y no debería inferirse de este documento): módulo de Purchases, Suppliers,
Customers, Inventory counting avanzado, Warehouses, Transfers, sincronización cloud, WebSockets,
QR, cambios al sistema de seguridad, dashboard, reporting avanzado, un historial visual de
movimientos en la UI (el diálogo de ajuste solo escribe, no lista), sistema de roles/permisos
nuevo. Tampoco se implementaron los tipos de movimiento `PURCHASE`, `RETURN`, `TRANSFER`,
`DAMAGE`, `LOSS`, `INITIAL_STOCK` — el enum de `type` está preparado para ampliarse (ver §Tipos de
movimiento), pero agregarlos es trabajo de una milestone futura, cuando exista el módulo de
negocio correspondiente (Purchases, etc.) que necesite producirlos.
