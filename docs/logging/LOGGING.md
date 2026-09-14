# Logging — arquitectura y funcionamiento

StockNegozia registra cada request HTTP y cada operación de negocio relevante (ventas, ajustes de
stock, transacciones) como un contrato de diagnóstico estructurado y persistente. El objetivo es
poder reconstruir exactamente qué pasó durante un incidente — incluida una IA distinta a la que
escribió el código (ver [`AI_LOG_ANALYSIS.md`](./AI_LOG_ANALYSIS.md)) — sin depender de memoria ni
de `console.log` sueltos.

## Flujo

```
HTTP Request
    ↓
Request ID (X-Request-Id: recibido y validado, o generado con crypto.randomUUID())
    ↓
RequestContextMiddleware (AsyncLocalStorage — el requestId queda disponible para todo el request)
    ↓
Controller
    ↓
Service (SalesService, ProductsService.adjustStock)
    ↓
Transaction (db.transaction — logging de started/committed/rollback alrededor, sin tocarla)
    ↓
Repository
    ↓
Database (SQLite — datos de negocio, nunca logs)
```

Todos los logs de un mismo request comparten el mismo `requestId`, sin que nadie tenga que pasarlo
manualmente entre capas — se obtiene automáticamente del contexto vía `AsyncLocalStorage`
(`apps/backend/src/common/logger/request-context.ts`).

## Dónde vive cada pieza

Todo el sistema está en `apps/backend/src/common/logger/`:

| Archivo                         | Responsabilidad                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app-logger.service.ts`         | `AppLogger` — API pública (`debug/info/warn/error`), filtra por `LOG_LEVEL`, escribe a consola (vía `Logger` de `@nestjs/common`) y persiste a JSONL. |
| `log-file-writer.ts`            | Persistencia JSONL best-effort. Crea su propio directorio, independiente de SQLite.                                                                   |
| `request-context.ts`            | `RequestContext` — wrapper de `AsyncLocalStorage` para el `requestId`.                                                                                |
| `request-context.middleware.ts` | Genera/valida `X-Request-Id`, lo devuelve en la respuesta, y loggea `http.request.started/completed/failed`.                                          |
| `global-exception.filter.ts`    | Manejo global de excepciones — respuesta HTTP consistente + logging del error real cuando es inesperado.                                              |
| `log-reader.ts`                 | `LogReader` — lectura/búsqueda del archivo JSONL (streaming).                                                                                         |
| `logger.module.ts`              | Wiring de todo lo anterior en NestJS (`@Global()`, `APP_FILTER`).                                                                                     |

## Persistencia

- **Formato**: JSONL (JSON Lines) — un evento por línea. Ver [`LOG_SCHEMA.md`](./LOG_SCHEMA.md)
  para el contrato exacto de cada campo.
- **Ubicación**: `LOG_DIR/app.log`. Por defecto, `LOG_DIR` es el mismo directorio de datos de
  usuario que ya usan SQLite/config/plugins (`<dataDir>/logs` — ver
  `apps/backend/src/config/configuration.ts`), **no** una carpeta nueva junto al código. Se puede
  sobreescribir con la variable `LOG_DIR`.
- **Independencia de SQLite**: el logging **nunca** se guarda en la base de datos de negocio. Si
  algún día se está diagnosticando un problema de SQLite/transacciones, el logger sigue funcionando
  porque no depende de esa misma base — `LogFileWriter` crea su propio directorio por su cuenta.
- **Sobrevive al reinicio**: al reiniciar el backend, el archivo `app.log` existente no se borra;
  las nuevas entradas se agregan al final (`appendFileSync`).
- **Best-effort**: un fallo al escribir el archivo (disco lleno, permisos, etc.) **nunca** rompe la
  operación de negocio ni provoca un rollback. Se reporta una única vez a `stderr` — nunca se
  reintenta loggear ese fallo con el logger mismo (evitaría un loop).

## Niveles

`DEBUG < INFO < WARN < ERROR`. Solo se escriben (consola y archivo) los niveles iguales o por
encima de `LOG_LEVEL` (default `info`). En desarrollo es común usar `LOG_LEVEL=debug` para ver el
detalle completo de transacciones y ajustes de stock, que en `info` quedan silenciados a propósito
(son ruido de alto volumen si todo funciona bien).

## `requestId`, `context`, `operation`, `event`

- **`requestId`**: correlaciona todos los logs de un mismo request HTTP. Viene de `X-Request-Id`
  (validado) o se genera. Ver la sección de validación más abajo.
- **`context`**: qué componente generó el log (`"HTTP"`, `"SalesService"`, `"ProductsService"`,
  `"ExceptionFilter"`).
- **`operation`**: qué operación estaba en curso (`"POST /sales"`, `"createSale"`, `"adjustStock"`).
- **`event`**: identificador técnico **estable** — ver [`LOG_SCHEMA.md`](./LOG_SCHEMA.md) para la
  lista completa. Es la clave para buscar y para que una IA reconstruya un flujo; no cambia entre
  versiones aunque `message` sí pueda cambiar.

## Validación de `X-Request-Id`

No se confía ciegamente en el header que envía el cliente. Se valida contra
`/^[A-Za-z0-9._-]{1,100}$/` (alfanumérico + `._-`, hasta 100 caracteres). Si el valor recibido no
matchea (vacío, con espacios, saltos de línea, demasiado largo, etc.), se genera uno nuevo con
`crypto.randomUUID()` en su lugar. El `requestId` final (recibido o generado) siempre se devuelve
en la respuesta vía el header `X-Request-Id` — en éxitos, errores de negocio y errores inesperados.

## HTTP logging

Cada request produce como mínimo `http.request.started` y, al finalizar
(`res.on("finish")`), `http.request.completed` (status < 400) o `http.request.failed` (status ≥
400), con `durationMs` y `statusCode`. El nivel de este segundo evento depende del status: `INFO`
si fue exitoso, `WARN` si fue un error 4xx, `ERROR` si fue un 5xx.

## Manejo global de errores

Ver `global-exception.filter.ts`. La respuesta HTTP siempre tiene `statusCode` y `requestId`, y
preserva cualquier otro campo propio de la excepción (por ejemplo, `errors` de
`ZodValidationPipe`). Para errores inesperados (no son una `HttpException` conocida) el body es
genérico (`"Internal server error"`, sin stack trace) — el detalle completo (con stack) queda solo
en el log interno (`http.unhandled_exception`, nivel `ERROR`).

Los errores de negocio (404/409/400) ya quedan registrados por el service que los lanza
(`sale.create.failed`, `stock.insufficient`, etc.) — el filtro no los vuelve a loggear con el mismo
detalle para no duplicar el mismo stack trace en dos capas.

## Transacciones

`SalesService.create()`/`cancel()` siguen usando `db.transaction(...)` exactamente igual que antes
— el logging solo agrega `transaction.started` (antes de abrir la transacción),
`transaction.committed` (justo después de que `db.transaction(...)` retorna sin lanzar, es decir,
ya se hizo commit) y `transaction.rollback` (en el `catch`, con un `reason` — por ejemplo
`insufficient_stock`, `product_not_found`, `already_cancelled`, `sale_not_found`, o
`unexpected_error`). El logging nunca decide si hay commit o rollback: solo lo observa.

## Stock

`ProductsService.adjustStock()` (el único punto de mutación de stock, usado tanto para descontar
como para restaurar) registra `stock.adjust.started/completed/failed` y, cuando corresponde,
`stock.insufficient` con el detalle (`productId`, `requested`, `available`). Ningún otro método de
`ProductsService` fue tocado para este milestone.

## Configuración

| Variable          | Default          | Descripción                                                                                        |
| ----------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| `LOG_LEVEL`       | `info`           | `debug` \| `info` \| `warn` \| `error`.                                                            |
| `LOG_DIR`         | `<dataDir>/logs` | Dónde se escribe `app.log`.                                                                        |
| `LOG_PERSISTENCE` | `true`           | `true`/`false`. Si es `false`, no se escribe a disco (solo consola, si está activa).               |
| `LOG_CONSOLE`     | `true`           | `true`/`false`. Si es `false`, no se imprime nada por consola (solo persistencia, si está activa). |

## Cómo leer los logs manualmente

El archivo es JSONL: cada línea es un JSON independiente. Para inspeccionarlo rápido desde una
terminal (sin herramientas adicionales):

```bash
# Ver todo un request por su requestId
grep "\"requestId\":\"<id>\"" apps/backend/data/logs/app.log

# Ver solo errores
grep '"level":"ERROR"' apps/backend/data/logs/app.log

# Ver un tipo de evento en particular
grep '"event":"stock.insufficient"' apps/backend/data/logs/app.log
```

O programáticamente con `LogReader`:

```ts
import { LogReader } from "./common/logger/log-reader";

const reader = new LogReader("apps/backend/data/logs/app.log");
const entries = await reader.findByRequestId("8f31c...");
```

## Cómo investigar un incidente

1. Conseguí el `requestId` (viene en el header `X-Request-Id` de la respuesta, o en el mensaje de
   error que reportó el usuario).
2. `reader.findByRequestId(id)` (o `grep` sobre el archivo).
3. Ordená por `timestamp` (ya vienen en orden de escritura, que es cronológico).
4. Buscá el primer `WARN`/`ERROR` o el primer `*.failed` — ahí está la causa raíz.
5. Si hay un `transaction.rollback`, mirá su `metadata.reason`.

Ver [`AI_LOG_ANALYSIS.md`](./AI_LOG_ANALYSIS.md) para instrucciones más detalladas pensadas para
que otra IA haga este mismo proceso de forma sistemática.
