# LOG_SCHEMA — contrato formal de cada entrada de log

Cada línea del archivo JSONL (`app.log`) es un objeto JSON independiente con esta forma
(`apps/backend/src/common/logger/log-entry.ts`):

```ts
interface LogEntry {
  timestamp: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR";
  requestId?: string;
  context: string;
  operation?: string;
  event: string;
  message: string;
  metadata?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
}
```

## Campos

### `timestamp`

- **Tipo**: `string` (ISO 8601, `Date.toISOString()`, ej. `"2026-09-14T02:30:10.010Z"`).
- **Obligatorio**: sí.
- **Propósito**: ordenar cronológicamente los eventos y correlacionarlos entre sí.

### `level`

- **Tipo**: `"DEBUG" | "INFO" | "WARN" | "ERROR"`.
- **Obligatorio**: sí.
- **Propósito**: severidad del evento. Orden: `DEBUG < INFO < WARN < ERROR`.
- **Cuándo usar cada uno**:
  - `DEBUG`: detalle interno de alto volumen (`transaction.started/committed`,
    `stock.adjust.started/completed`) — útil para reconstrucción completa, ruido en producción.
  - `INFO`: hitos de negocio normales (`sale.create.started/completed`,
    `http.request.started/completed`).
  - `WARN`: algo salió mal pero de forma **esperada** — una regla de negocio impidió la operación
    (`stock.insufficient`, `transaction.rollback` por una causa conocida, `*.failed` cuando la
    causa es una `HttpException` con status < 500).
  - `ERROR`: algo salió mal de forma **inesperada** (excepción no controlada, bug). Siempre viene
    acompañado de `error` con `stack`.

### `requestId`

- **Tipo**: `string`, opcional.
- **Cuándo aparece**: en todo log generado dentro de un request HTTP (vía `AsyncLocalStorage`).
  Ausente en logs que ocurren fuera de un request (por ejemplo, en un test que no envolvió la
  llamada con `RequestContext.run(...)`).
- **Ejemplo**: `"8f31c2e4-6b9d-4a1a-9b0e-1234567890ab"` (UUID generado) o `"abc123"` (si el cliente
  envió un `X-Request-Id` válido).
- **Propósito**: es la clave principal para reconstruir un incidente completo — ver
  [`AI_LOG_ANALYSIS.md`](./AI_LOG_ANALYSIS.md).

### `context`

- **Tipo**: `string`.
- **Obligatorio**: sí.
- **Valores conocidos**: `"HTTP"`, `"SalesService"`, `"ProductsService"`, `"ExceptionFilter"`.
- **Propósito**: qué componente/capa generó el log.

### `operation`

- **Tipo**: `string`, opcional.
- **Cuándo aparece**: casi siempre. Ausente solo en algún log genérico sin una operación puntual
  asociada.
- **Ejemplos**: `"POST /sales"` (HTTP), `"createSale"` / `"cancelSale"` (SalesService),
  `"adjustStock"` (ProductsService).
- **Propósito**: qué operación de negocio o endpoint estaba en curso.

### `event`

- **Tipo**: `string`.
- **Obligatorio**: sí.
- **Propósito**: identificador técnico **estable** de qué ocurrió. No cambia entre versiones del
  código (a diferencia de `message`). Es el campo principal para búsqueda y análisis automático —
  ver la lista completa de eventos conocidos más abajo.

### `message`

- **Tipo**: `string`.
- **Obligatorio**: sí.
- **Propósito**: descripción legible para humanos. **Puede cambiar** entre versiones — nunca
  construyas lógica de análisis que dependa del texto exacto de `message`; usá `event`.

### `metadata`

- **Tipo**: `Record<string, unknown>`, opcional (por defecto `{}` si no se especifica nada).
- **Propósito**: datos estructurados específicos del evento. Nunca incluye información sensible
  (ver más abajo). Ejemplos por evento:
  - `stock.insufficient`: `{ productId, requested, available }`.
  - `transaction.rollback`: `{ transactionType, reason, saleId? }`.
  - `sale.create.completed`: `{ saleId, total, itemCount }`.
  - `http.request.completed`/`failed`: `{ method, path, statusCode, durationMs }`.

### `error`

- **Tipo**: `{ name: string; message: string; stack?: string }`, opcional.
- **Cuándo aparece**: solo en logs que representan un error y donde se capturó una excepción real
  (`sale.create.failed`, `sale.cancel.failed`, `http.unhandled_exception`). **No** aparece en
  `stock.insufficient`/`stock.adjust.failed` (ese detalle ya está en `metadata`, para no duplicar
  el mismo stack trace en varias capas — ver `LOGGING.md`).
- **Propósito**: diagnóstico completo del error, incluyendo el stack trace. Este campo **nunca**
  se envía al cliente HTTP — solo vive en el log interno.

## Información sensible

Por diseño, el logger **nunca** registra automáticamente: passwords, tokens, API keys, cookies,
headers de `Authorization`, ni el body completo de un request. `metadata` solo contiene los campos
puntuales que cada evento necesita para diagnosticarse (IDs, cantidades, montos, razones) — nunca
un dump genérico del request/response.

## Eventos conocidos

| Evento                     | Nivel típico | Contexto        | Cuándo se emite                                                                                                                                                                                                        |
| -------------------------- | ------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `http.request.started`     | INFO         | HTTP            | Al recibir cualquier request.                                                                                                                                                                                          |
| `http.request.completed`   | INFO         | HTTP            | Al responder con status < 400.                                                                                                                                                                                         |
| `http.request.failed`      | WARN/ERROR   | HTTP            | Al responder con status ≥ 400 (WARN si 4xx, ERROR si 5xx).                                                                                                                                                             |
| `http.unhandled_exception` | ERROR        | ExceptionFilter | Una excepción que no es una `HttpException` conocida llegó al filtro global. Incluye `error` con stack.                                                                                                                |
| `sale.create.started`      | INFO         | SalesService    | Al empezar `SalesService.create()`.                                                                                                                                                                                    |
| `sale.create.completed`    | INFO         | SalesService    | La venta se creó y confirmó (transacción commiteada).                                                                                                                                                                  |
| `sale.create.failed`       | WARN/ERROR   | SalesService    | `create()` lanzó una excepción (WARN si es de negocio, ERROR si es inesperada). Incluye `error`.                                                                                                                       |
| `sale.cancel.started`      | INFO         | SalesService    | Al empezar `SalesService.cancel()`.                                                                                                                                                                                    |
| `sale.cancel.completed`    | INFO         | SalesService    | La cancelación se confirmó.                                                                                                                                                                                            |
| `sale.cancel.failed`       | WARN/ERROR   | SalesService    | `cancel()` lanzó una excepción. Incluye `error`.                                                                                                                                                                       |
| `stock.adjust.started`     | DEBUG        | ProductsService | Al empezar `adjustStock()` (venta o cancelación).                                                                                                                                                                      |
| `stock.adjust.completed`   | DEBUG        | ProductsService | El ajuste de stock se aplicó.                                                                                                                                                                                          |
| `stock.adjust.failed`      | WARN         | ProductsService | `adjustStock()` lanzó una excepción (producto inexistente o stock insuficiente).                                                                                                                                       |
| `stock.insufficient`       | WARN         | ProductsService | El delta solicitado dejaría el stock en negativo. Incluye `productId`/`requested`/`available` en `metadata`.                                                                                                           |
| `transaction.started`      | DEBUG        | SalesService    | Justo antes de llamar a `db.transaction(...)`.                                                                                                                                                                         |
| `transaction.committed`    | DEBUG        | SalesService    | `db.transaction(...)` retornó sin lanzar — ya se hizo commit.                                                                                                                                                          |
| `transaction.rollback`     | WARN         | SalesService    | La transacción lanzó una excepción — better-sqlite3 revirtió todo. `metadata.reason` indica la causa conocida (`insufficient_stock`, `product_not_found`, `already_cancelled`, `sale_not_found`) o `unexpected_error`. |

`event` es estable: si en el futuro se agregan eventos nuevos, los existentes no cambian de
nombre ni de significado.

## Ejemplo de un flujo exitoso completo

```json
{"timestamp":"2026-09-14T02:30:10.000Z","level":"INFO","requestId":"8f31c...","context":"HTTP","operation":"POST /sales","event":"http.request.started","message":"Request started","metadata":{"method":"POST","path":"/sales"}}
{"timestamp":"2026-09-14T02:30:10.005Z","level":"INFO","requestId":"8f31c...","context":"SalesService","operation":"createSale","event":"sale.create.started","message":"Creating sale","metadata":{"itemCount":1}}
{"timestamp":"2026-09-14T02:30:10.006Z","level":"DEBUG","requestId":"8f31c...","context":"SalesService","operation":"createSale","event":"transaction.started","message":"Transaction started","metadata":{"transactionType":"sale.create"}}
{"timestamp":"2026-09-14T02:30:10.008Z","level":"DEBUG","requestId":"8f31c...","context":"ProductsService","operation":"adjustStock","event":"stock.adjust.started","message":"Adjusting stock","metadata":{"productId":1,"delta":-2}}
{"timestamp":"2026-09-14T02:30:10.010Z","level":"DEBUG","requestId":"8f31c...","context":"ProductsService","operation":"adjustStock","event":"stock.adjust.completed","message":"Stock adjusted","metadata":{"productId":1,"delta":-2,"stock":8}}
{"timestamp":"2026-09-14T02:30:10.012Z","level":"DEBUG","requestId":"8f31c...","context":"SalesService","operation":"createSale","event":"transaction.committed","message":"Transaction committed","metadata":{"transactionType":"sale.create"}}
{"timestamp":"2026-09-14T02:30:10.013Z","level":"INFO","requestId":"8f31c...","context":"SalesService","operation":"createSale","event":"sale.create.completed","message":"Sale created","metadata":{"saleId":1,"total":4000,"itemCount":1}}
{"timestamp":"2026-09-14T02:30:10.015Z","level":"INFO","requestId":"8f31c...","context":"HTTP","operation":"POST /sales","event":"http.request.completed","message":"Request completed","metadata":{"method":"POST","path":"/sales","statusCode":201,"durationMs":15}}
```

## Ejemplo de un flujo con stock insuficiente (rollback)

```json
{"timestamp":"2026-09-14T02:30:10.000Z","level":"INFO","requestId":"9a42d...","context":"HTTP","operation":"POST /sales","event":"http.request.started","message":"Request started","metadata":{"method":"POST","path":"/sales"}}
{"timestamp":"2026-09-14T02:30:10.005Z","level":"INFO","requestId":"9a42d...","context":"SalesService","operation":"createSale","event":"sale.create.started","message":"Creating sale","metadata":{"itemCount":1}}
{"timestamp":"2026-09-14T02:30:10.006Z","level":"DEBUG","requestId":"9a42d...","context":"SalesService","operation":"createSale","event":"transaction.started","message":"Transaction started","metadata":{"transactionType":"sale.create"}}
{"timestamp":"2026-09-14T02:30:10.008Z","level":"DEBUG","requestId":"9a42d...","context":"ProductsService","operation":"adjustStock","event":"stock.adjust.started","message":"Adjusting stock","metadata":{"productId":5,"delta":-100}}
{"timestamp":"2026-09-14T02:30:10.009Z","level":"WARN","requestId":"9a42d...","context":"ProductsService","operation":"adjustStock","event":"stock.insufficient","message":"Insufficient stock for product \"Yerba\"","metadata":{"productId":5,"requested":100,"available":3}}
{"timestamp":"2026-09-14T02:30:10.009Z","level":"WARN","requestId":"9a42d...","context":"ProductsService","operation":"adjustStock","event":"stock.adjust.failed","message":"Stock adjustment failed","metadata":{"productId":5,"delta":-100}}
{"timestamp":"2026-09-14T02:30:10.010Z","level":"WARN","requestId":"9a42d...","context":"SalesService","operation":"createSale","event":"transaction.rollback","message":"Transaction rolled back","metadata":{"transactionType":"sale.create","reason":"insufficient_stock"}}
{"timestamp":"2026-09-14T02:30:10.011Z","level":"WARN","requestId":"9a42d...","context":"SalesService","operation":"createSale","event":"sale.create.failed","message":"Sale creation failed","metadata":{"itemCount":1},"error":{"name":"ConflictException","message":"Stock insuficiente para el producto \"Yerba\"","stack":"ConflictException: Stock insuficiente...\n    at ProductsService.adjustStock (...)"}}
{"timestamp":"2026-09-14T02:30:10.012Z","level":"WARN","requestId":"9a42d...","context":"HTTP","operation":"POST /sales","event":"http.request.failed","message":"Request failed","metadata":{"method":"POST","path":"/sales","statusCode":409,"durationMs":12}}
```
