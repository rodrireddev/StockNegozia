# AI_LOG_ANALYSIS — instrucciones para reconstruir un incidente a partir de `app.log`

Este documento está pensado para que una IA (la misma que mantiene este proyecto, u otra distinta)
reciba un archivo `app.log` (JSONL) y, siguiendo estos pasos, produzca un informe preciso de qué
ocurrió — sin inventar información que los logs no permitan demostrar.

Antes de seguir estos pasos, leé [`LOG_SCHEMA.md`](./LOG_SCHEMA.md) para conocer el significado
exacto de cada campo y la lista de eventos conocidos. Recordá: **`event` es el identificador
técnico estable — usalo para el análisis. `message` es descriptivo y puede cambiar; no lo uses
como mecanismo principal de reconstrucción.**

## Paso 1 — Parsear los logs

Cada línea del archivo es un JSON independiente (JSONL). Para cada línea, intentá `JSON.parse`.

- Si una línea parsea correctamente, extraé sus campos (`timestamp`, `level`, `requestId`,
  `context`, `operation`, `event`, `message`, `metadata`, `error`).
- Si una línea **no** puede parsearse (JSON inválido, línea truncada, etc.): **no inventes su
  contenido**. Anotala como "entrada inválida" en la sección de anomalías del informe final, con su
  número de línea si es posible, y seguí procesando el resto del archivo.

## Paso 2 — Agrupar por `requestId`

Todas las entradas que comparten el mismo `requestId` pertenecen potencialmente al mismo flujo
HTTP. Agrupalas. Las entradas sin `requestId` (poco frecuente — ocurren solo fuera de un request
HTTP) quedan en un grupo aparte; no las fuerces dentro de ningún request.

## Paso 3 — Orden cronológico

Dentro de cada grupo, ordená por `timestamp` ascendente. Si dos entradas tienen el mismo
`timestamp` exacto, usá el orden en que aparecen en el archivo como criterio de desempate (el
archivo se escribe secuencialmente, así que el orden de escritura ya es un orden cronológico
válido incluso ante timestamps idénticos).

## Paso 4 — Reconstruir el flujo

Para el request que estés analizando, recorré la secuencia ordenada y armá la cadena
`HTTP → Controller → Service → Transaction → Repository → Database` a partir de `context` y
`event`. Los eventos con prefijo `http.*` son la capa HTTP; `sale.*`/`stock.*` son la capa de
negocio (Service); `transaction.*` marca el límite transaccional.

## Paso 5 — Identificar eventos importantes

Prestá especial atención a:

- Cualquier entrada con `level` `WARN` o `ERROR`.
- `stock.insufficient`.
- `transaction.rollback`.
- `transaction.committed`.
- Cualquier evento que termine en `.failed`.

## Paso 6 — Reconstruir transacciones

Para cada `transaction.started` dentro del grupo, buscá su cierre correspondiente:

- Si encontrás un `transaction.committed` posterior (mismo `requestId`, mismo `operation`), la
  transacción terminó con éxito.
- Si encontrás un `transaction.rollback` posterior, la transacción se revirtió — mirá
  `metadata.reason` para la causa (si está disponible).
- Si **no** encontrás ni uno ni otro antes de que termine el grupo (o antes del siguiente
  `transaction.started` de otro request), reportalo como **logging incompleto** (ver Paso 11) — no
  asumas cuál fue el desenlace.

## Paso 7 — Determinar persistencia

`transaction.committed` implica que los cambios de esa transacción (fila(s) de `sales`,
`sale_items`, y los ajustes de stock en `products` que ocurrieron dentro de ella) quedaron
persistidos en SQLite. `transaction.rollback` implica exactamente lo contrario: **ningún** cambio
de esa transacción persistió, incluyendo ajustes de stock que puedan haberse procesado
_antes_ del que falló dentro de la misma transacción (las transacciones de Sales son atómicas:
todo o nada). No afirmes que algo persistió si no hay un `transaction.committed` que lo respalde.

## Paso 8 — Identificar causa raíz vs. error propagado

Un error casi siempre aparece en más de un evento a medida que se propaga hacia arriba. Buscá el
evento **más específico y más temprano** en la cadena como causa raíz; los eventos posteriores
(`transaction.rollback`, `sale.create.failed`, `http.request.failed`) son la **propagación** de esa
misma causa, no causas nuevas.

Ejemplo:

```
stock.insufficient          ← causa raíz
  ↓
stock.adjust.failed         ← propagación (misma causa, una capa arriba)
  ↓
transaction.rollback        ← propagación (consecuencia transaccional)
  ↓
sale.create.failed          ← propagación (el Service reporta que falló)
  ↓
http.request.failed (409)   ← propagación (respuesta al cliente)
```

La causa raíz es `stock.insufficient` — específicamente, el producto y las cantidades en su
`metadata` (`productId`, `requested`, `available`). No es "HTTP 409": eso es solo el síntoma
visible desde afuera.

Cuando el evento `*.failed` trae un campo `error`, su `error.name`/`error.message` da la clase de
excepción real (`ConflictException`, `NotFoundException`, o algo inesperado) — usalo para confirmar
la causa, no para reemplazar el análisis de los eventos anteriores.

## Paso 9 — Relacionar módulos

Si dentro del mismo `requestId` aparecen `context: "SalesService"` y `context: "ProductsService"`,
son dos capas de la misma operación (Sales delega en Products para el stock) — no los trates como
dos incidentes independientes.

## Paso 10 — Identificar información faltante

Si los logs disponibles no alcanzan para determinar algo con certeza (por ejemplo, no hay
`transaction.committed` ni `transaction.rollback`, o falta el evento que explicaría un `WARN`),
decilo explícitamente en el informe:

> No hay suficiente información en los logs para determinar X.

Nunca completes ese vacío con una suposición presentada como hecho.

## Paso 11 — Detectar anomalías ("incomplete logging")

Además del análisis del incidente puntual, revisá el archivo (o el grupo del request) en busca de:

- Requests con `http.request.started` pero sin `http.request.completed` ni `http.request.failed`.
- `transaction.started` sin `transaction.committed` ni `transaction.rollback`.
- Cualquier `*.started` sin su `*.completed` ni `*.failed` correspondiente.
- `transaction.rollback` sin ningún `WARN`/`ERROR` previo que explique la causa.
- Entradas con `level: "ERROR"` o `"WARN"` sin `requestId`.
- Un mismo `requestId` reutilizado en timestamps muy separados (podría indicar un ID mal generado
  o reusado por el cliente).
- Eventos fuera de orden cronológico dentro del mismo request.
- Líneas JSONL inválidas (ver Paso 1).
- El mismo error repitiéndose muchas veces en poco tiempo (podría indicar un loop o un reintento
  automático).

Reportá estas situaciones como **"incomplete logging"** en una sección aparte. Importante: una
anomalía de logging **no implica automáticamente** que hubo un error de negocio — puede ser
simplemente que el proceso se cerró abruptamente (por ejemplo, durante desarrollo) antes de que el
evento de cierre se escribiera. Decilo así, sin sacar conclusiones de negocio no respaldadas.

## Formato del informe final

Producí un informe en words claros, no solo una lista de eventos. Por ejemplo:

```markdown
## Resumen

Se intentó crear una venta con 1 producto.

## Request

requestId: 9a42d...

## Flujo

1. Se recibió POST /sales.
2. SalesService inició createSale.
3. Se inició una transacción.
4. Se intentó descontar stock del producto "Yerba" (id 5): se pidieron 100 unidades, había 3.
5. Se produjo stock.insufficient.
6. La transacción hizo rollback (reason: insufficient_stock).
7. SalesService reportó sale.create.failed.
8. La API respondió 409.

## Causa raíz

Stock insuficiente para el producto "Yerba" (id 5): se pidieron 100, había 3 disponibles.

## Resultado

La venta no fue persistida (no hay transaction.committed). El stock del producto no cambió.

## Anomalías detectadas

Ninguna.

## Request ID

9a42d...
```

Si el archivo contiene múltiples requests, indicá al principio cuántos se analizaron y cuál es el
foco del informe (por `requestId` específico, o un resumen de todos si así se pidió).
