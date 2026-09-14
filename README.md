# StockNegozia

Plataforma modular de gestión empresarial, pensada inicialmente para pequeños comercios. Este
repositorio es un monorepo con aplicación de escritorio (Electron + React) y backend (NestJS +
Drizzle + SQLite), conectados de punta a punta. El backend ya implementa lógica de negocio real
para **Productos, Categorías, Proveedores, Compras, Ventas y Movimientos de stock**; el frontend
tiene interfaz funcional real para **Productos** y **Ventas** — ver [Estado actual](#estado-actual)
para el detalle de qué está terminado y qué todavía es un punto de extensión sin implementar.

## Estado actual

- ✅ Monorepo pnpm + Turborepo funcionando (`typecheck`, `lint`, `build`, `test`, `format` limpios
  en las 7 packages/apps).
- ✅ `pnpm dev` levanta Electron, que arranca el backend NestJS como proceso hijo, espera a
  `/health`, muestra la ventana con React, y detiene el backend al cerrar la app.
- ✅ Drizzle ORM conectado a SQLite real (`better-sqlite3`), con 9 migraciones aplicadas
  automáticamente al bootear el backend — Productos, Categorías, Proveedores, Compras, Ventas,
  Movimientos de stock, Dispositivos y Pairing ya están modelados y persistidos.
- ✅ Backend: `products`, `categories`, `suppliers`, `purchases`, `sales` y `stock-movements`
  tienen controller/service/repository reales (entidades, transacciones SQLite, auditoría de
  stock), cubiertos por 211 tests (`pnpm --filter @stocknegozia/backend test`).
- ✅ Frontend: **Productos** (crear, editar, buscar/filtrar, ajustar stock) y **Ventas** (buscar o
  escanear producto, carrito persistente, confirmar venta) tienen interfaz real, con 28 tests
  (`pnpm --filter @stocknegozia/desktop test`, Vitest + Testing Library).
- ✅ Control de acceso a la API por credential de dispositivo (`API_ACCESS_MODE`) y pairing de
  dispositivos adicionales vía QR + código de verificación — ver [Seguridad](#seguridad).
- ⬜ Compras, Inventario (historial de movimientos) y Clientes: el backend de Compras y
  Movimientos de stock ya está completo, pero todavía no tienen interfaz — son páginas placeholder
  en el frontend (ver [Alcance de esta etapa](#alcance-de-esta-etapa)).
- ⬜ Sin empaquetado de producción (no hay instalador), sin UI de pairing/Device Management, sin
  backup/restore/exportación de datos.

## Arquitectura

```
Desktop (Electron)              Backend (NestJS)
  ├─ Main process    ──spawn──►    Core
  │   administra el              (Products, Categories, Suppliers,
  │   ciclo de vida del           Purchases, Sales, StockMovements — real;
  │   backend                     Inventory, Customers, Users, Permissions
  └─ Renderer (React)             — placeholders)
       consume la API HTTP             │
       del backend (CORS)              ▼
                                  Drizzle ORM ──► SQLite
```

El frontend **nunca** accede a SQLite directamente; siempre pasa por la API HTTP del backend.
Electron no contiene lógica de negocio: su único rol es administrar el ciclo de vida del backend y
mostrar la ventana.

## Estructura del monorepo

```
StockNegozia/
├── apps/
│   ├── desktop/                          @stocknegozia/desktop — Electron + React
│   │   ├── electron/
│   │   │   ├── main/
│   │   │   │   ├── index.ts              ciclo de vida de la app, flags de GPU, bootstrap
│   │   │   │   ├── backend-manager.ts    spawn/stop/supervisión/health-poll del backend
│   │   │   │   ├── bootstrap-device.ts   canjea el token de bootstrap por una credential propia
│   │   │   │   ├── device-credential-store.ts  credential cifrada con `safeStorage`
│   │   │   │   └── window.ts             creación del BrowserWindow
│   │   │   └── preload/
│   │   │       └── index.ts              contextBridge mínimo (backendBaseUrl, versions)
│   │   ├── renderer/
│   │   │   ├── index.html
│   │   │   └── src/
│   │   │       ├── app/                  App.tsx, router.tsx (createHashRouter)
│   │   │       ├── features/
│   │   │       │   ├── products/         real — CRUD, búsqueda/filtros, ajuste de stock
│   │   │       │   ├── sales/            real — búsqueda/escaneo, carrito, confirmar venta
│   │   │       │   ├── purchases/        placeholder
│   │   │       │   ├── inventory/        placeholder
│   │   │       │   ├── customers/        placeholder
│   │   │       │   └── dashboard/        widget de estado del backend (`/health`)
│   │   │       ├── components/ui/        shadcn: button, card, badge, dialog, input, label,
│   │   │       │                         select, table, textarea, separator, quantity-stepper
│   │   │       ├── layouts/              MainLayout.tsx (sidebar + Outlet)
│   │   │       ├── stores/               ui-store.ts (Zustand: sidebar colapsable)
│   │   │       ├── hooks/                useHealth.ts (TanStack Query)
│   │   │       ├── lib/                  api-client.ts, query-client.ts, errors.ts, utils.ts
│   │   │       ├── test/                 setup.ts (Testing Library + jest-dom)
│   │   │       └── types/                global.d.ts (window.stockNegozia)
│   │   ├── electron.vite.config.ts       build de main/preload/renderer
│   │   ├── vitest.config.ts              tests del renderer (jsdom + Testing Library)
│   │   ├── tailwind.config.ts / components.json
│   │   └── package.json
│   │
│   └── backend/                          @stocknegozia/backend — NestJS
│       ├── src/
│       │   ├── main.ts                   bootstrap, CORS, puerto configurable
│       │   ├── app.module.ts             ConfigModule, EventEmitterModule, Database/Core/Health
│       │   ├── config/                   configuration.ts (env+data dir), ensure-data-dirs.ts
│       │   ├── database/                 database.module.ts (Drizzle+SQLite), schema/, migrations/
│       │   ├── auth/                     ApiAccessGuard (APP_GUARD), AdminDeviceGuard, Device
│       │   │                             Management/Credential/Bootstrap/Pairing — ver
│       │   │                             docs/security/API_ACCESS.md, PAIRING.md, DEVICE_MANAGEMENT.md
│       │   ├── core/                     CoreModule + módulos de dominio — Products, Categories,
│       │   │                             Suppliers, Purchases, Sales y StockMovements (real; ver
│       │   │                             docs/inventory/), Inventory/Customers/Users/Permissions
│       │   │                             siguen siendo placeholders — ver core/README.md
│       │   └── health/                   GET /health (@Public) con roundtrip real a SQLite
│       ├── drizzle.config.ts             config de drizzle-kit (generate)
│       ├── vitest.config.ts              211 tests (unit + e2e con supertest)
│       ├── nest-cli.json
│       └── package.json
│
├── packages/
│   ├── shared/            @stocknegozia/shared — AppInfo, APP_NAME, DEFAULT_BACKEND_PORT
│   ├── api-contracts/     @stocknegozia/api-contracts — DTOs compartidos back↔front (health,
│   │                      products, sales, purchases, suppliers, inventory/stock-movements, auth)
│   ├── validation/        @stocknegozia/validation — schemas Zod compartidos (env, products,
│   │                      sales, purchases, suppliers, inventory, auth) — la misma fuente de
│   │                      verdad valida en el backend (ZodValidationPipe) y en los formularios
│   │                      del renderer
│   └── config/            @stocknegozia/config — tsconfig (base/node/react), eslint, prettier
│
├── plugins/
│   └── README.md          documenta el futuro Plugin Manifest/SDK/Runtime — sin código aún
│
├── tooling/
│   └── README.md          placeholder para scripts futuros del monorepo (vacío)
│
├── package.json           scripts raíz (dev/build/lint/typecheck/test/format) vía Turborepo
├── pnpm-workspace.yaml     apps/*, packages/*; onlyBuiltDependencies/allowBuilds para
│                           better-sqlite3, electron, esbuild
├── turbo.json              pipeline: build (dependsOn ^build), dev (persistent), lint, test, typecheck
├── tsconfig.json           project references a los packages compartidos
├── eslint.config.js        re-exporta packages/config/eslint/base.js
├── .prettierrc.js / .prettierignore
└── .gitignore
```

## Decisiones técnicas

- **SQLite driver: `better-sqlite3`** (vía `drizzle-orm/better-sqlite3`) — soporte oficial de
  primera clase en Drizzle, API síncrona, el más usado en apps Electron. Requiere compilación
  nativa (node-gyp); en Windows necesita Visual Studio Build Tools (ver [Requisitos](#requisitos)).
- **`electron-vite`** para build/dev de Electron — orquesta main/preload/renderer con Vite + HMR,
  evita configurar 3 bundlers a mano.
- **`react-router-dom`** (`createHashRouter`) para navegación entre features — necesario para una
  UI feature-based con múltiples páginas; hash router evita problemas de rutas al cargar desde
  `file://` en producción.
- **`@nestjs/event-emitter`** como Event Bus interno (preparado, sin eventos de negocio aún) — el
  paquete oficial de Nest para este propósito, evita un broker externo.
- **`zod`** en `packages/validation`, compartido entre backend y frontend — un único punto de
  verdad para reglas de validación (formato de precios, stock no negativo, campos obligatorios).
- **Vitest** como test runner en backend (unit + e2e con `supertest`, contra SQLite en memoria con
  migraciones reales) y en el renderer (`@testing-library/react` + `jsdom`, mockeando la capa de
  API) — mismo runner en ambas apps, cada una con su propio `vitest.config.ts`.
- **Ubicación de datos**: el backend resuelve el directorio de datos desde
  `STOCKNEGOZIA_DATA_DIR` (env var). Electron se lo inyecta como `app.getPath('userData')` al
  spawnear el proceso hijo; si el backend corre standalone, cae a `./data` relativo al cwd.
- **Puerto configurable**: `STOCKNEGOZIA_PORT`, default `38123` (elegido para minimizar choques
  con puertos comunes como 3000). Sin descubrimiento automático de puerto libre en esta etapa.
- **Nombres de paquete explícitos**: todo bajo el scope `@stocknegozia/*` para que
  `pnpm --filter` no sea ambiguo cuando crezca el monorepo.
- **CORS habilitado** (`app.enableCors()`) en el backend: el renderer de Electron sirve desde un
  origen distinto (`localhost:5173` en dev, `file://` empaquetado), así que necesita CORS para
  consumir la API local.
- **GPU deshabilitada en el proceso Electron main** (`disableHardwareAcceleration` +
  `disable-gpu`/`disable-gpu-compositing`/`disable-software-rasterizer`/`disable-gpu-sandbox`/
  `in-process-gpu`): StockNegozia es una app de negocio, no gráficamente intensiva; esto evita
  caídas del proceso de GPU en máquinas virtuales, escritorios remotos o con drivers de video
  problemáticos — un compromiso habitual en apps Electron de tipo LOB.

## Requisitos

- Node.js >= 20
- pnpm (ver `packageManager` en `package.json`; se activa vía `corepack` o `npm i -g pnpm`)
- En Windows: Visual Studio Build Tools (workload "Desktop development with C++") + Python, para
  compilar `better-sqlite3` vía node-gyp.

## Uso

```bash
pnpm install
pnpm dev
```

`pnpm dev` corre `turbo run dev --filter=@stocknegozia/desktop`, que primero build-ea los packages
compartidos y luego ejecuta `electron-vite dev`. Electron arranca el backend NestJS como proceso
hijo (`pnpm --filter @stocknegozia/backend start:dev`), espera a que `/health` responda antes de
mostrar la ventana, y lo detiene (`taskkill /t /f` en Windows) al cerrar la aplicación.

Otros scripts (raíz, vía Turborepo):

```bash
pnpm build       # build de todos los packages/apps
pnpm lint        # eslint en todo el monorepo
pnpm typecheck   # tsc --noEmit en todo el monorepo
pnpm test        # tests de backend y desktop (Vitest) en todo el monorepo
pnpm format      # prettier --write
pnpm format:check
```

### Probar la app manualmente (QA a mano)

`pnpm dev` (ver arriba) es el único comando que hace falta para tener la app funcionando en
local — no requiere `.env` ni configuración previa (`API_ACCESS_MODE` cae en `development` por
defecto, sin credential). Con la ventana de Electron abierta:

1. **Productos** → `+ Nuevo producto` → cargar nombre, SKU y un stock inicial (ej. 10) → guardar.
2. **Ventas** → el buscador ya tiene el foco; escribí el nombre o SKU del producto creado (o
   tipeá el código de barras + Enter si simulás un lector) → click en el resultado para agregarlo
   al carrito.
3. Ajustá la cantidad con `+`/`-`, confirmá la venta, y volvé a **Productos** para verificar que
   el stock bajó — cada venta genera además un `stock_movement` auditable (ver
   [Inventario](#inventario)), consultable hoy solo vía API (`GET /products/:id/stock-movements`),
   todavía sin pantalla propia.

Para probar solo la API sin abrir Electron (por ejemplo con curl/Postman), se puede levantar el
backend solo:

```bash
pnpm --filter @stocknegozia/backend start:dev
```

Queda escuchando en `http://localhost:38123` (`STOCKNEGOZIA_PORT`), con `/health` como primer
chequeo. Esto es independiente de `pnpm test`, que corre la suite automatizada (backend + desktop)
sin necesidad de tener la app corriendo.

Scripts propios de cada app (`pnpm --filter <nombre> <script>`):

- `@stocknegozia/backend`: `build`, `start:dev` (nest watch), `start:prod` (`node dist/main.js`),
  `dev`, `typecheck`, `lint`, `test` (vitest run), `test:watch`, `db:generate` (drizzle-kit).
- `@stocknegozia/desktop`: `dev`, `build`, `preview`, `typecheck`, `lint`, `test` (vitest run),
  `test:watch`.

## Base de datos

SQLite se almacena fuera del directorio de instalación, en el directorio de datos de usuario del
sistema operativo (`app.getPath('userData')` cuando corre bajo Electron; `./data` cuando el backend
corre de forma independiente). Dentro de ese directorio, el backend crea `database/`, `config/`,
`logs/` y `plugins/` (ver `apps/backend/src/config/`).

Para generar una nueva migración tras modificar el schema de Drizzle (`apps/backend/src/database/schema/`):

```bash
pnpm --filter @stocknegozia/backend db:generate
```

Las migraciones (`apps/backend/src/database/migrations/`, 9 hasta el momento) se aplican
automáticamente al iniciar el backend (se resuelven desde el árbol fuente, no desde `dist/`, para
evitar condiciones de carrera con el watcher de `nest start --watch`).

## Logging

El backend registra cada request y cada operación de negocio relevante (ventas, compras, ajustes
de stock, transacciones) como logs estructurados JSONL, persistidos en disco e independientes de
SQLite. Ver [`docs/logging/`](docs/logging/) para el detalle completo:

- [`LOGGING.md`](docs/logging/LOGGING.md) — arquitectura, flujo y configuración.
- [`LOG_SCHEMA.md`](docs/logging/LOG_SCHEMA.md) — contrato formal de cada campo y lista de eventos.
- [`AI_LOG_ANALYSIS.md`](docs/logging/AI_LOG_ANALYSIS.md) — instrucciones para que una IA
  reconstruya un incidente a partir de `app.log`.

Variables de entorno (`apps/backend/.env.example`):

```env
LOG_LEVEL=info        # debug | info | warn | error
LOG_DIR=./logs        # default: <dataDir>/logs (mismo directorio que SQLite/config/plugins)
LOG_PERSISTENCE=true  # false desactiva la escritura a disco
LOG_CONSOLE=true      # false desactiva la salida por consola
```

Cada respuesta HTTP incluye un header `X-Request-Id` (recibido y validado, o generado) que
correlaciona todos los logs de ese request — útil para investigar un incidente puntual con
`grep` o con `LogReader` (`apps/backend/src/common/logger/log-reader.ts`).

## Inventario

Toda modificación efectiva de `products.stock` — venta, cancelación, compra, o ajuste manual —
genera obligatoriamente un movimiento de stock auditable e inmutable (`stock_movements`), separado
del estado actual (`products.stock`) y del log técnico (`app.log`). `ProductsService.adjustStock()`
es el único punto de mutación de stock; no existe ninguna vía pública que lo evite. Los ajustes
manuales se hacen vía `POST /products/:id/stock-adjustments` (stock absoluto + motivo obligatorio
— el backend calcula el delta internamente); no existe `PATCH /products/:id/stock`. Ver
[`docs/inventory/STOCK_MOVEMENTS.md`](docs/inventory/STOCK_MOVEMENTS.md) y
[`docs/inventory/PURCHASES.md`](docs/inventory/PURCHASES.md) para el detalle completo — modelo,
tipos de movimiento, atomicidad, `requestId`, y endpoints de consulta (`GET /stock-movements`,
`GET /products/:id/stock-movements`). El historial de movimientos todavía no tiene interfaz propia
en el frontend (ver [Alcance de esta etapa](#alcance-de-esta-etapa)).

## Ventas

La pantalla de Ventas (`/sales`) es la única interfaz pensada específicamente para una operación
frecuente, no un CRUD genérico: buscador con foco automático (por nombre, SKU o código de barras —
compatible con lectores de código de barras, que funcionan como un teclado que tipea y manda
Enter), carrito persistente donde agregar el mismo producto dos veces incrementa la cantidad en vez
de duplicar la línea, y confirmación que solo limpia el carrito después de que el backend confirmó
la venta (`POST /sales`, transaccional — ver [Inventario](#inventario)). El backend es siempre la
autoridad final sobre el stock disponible: la UI nunca lo modifica directamente ni confía
exclusivamente en el stock mostrado en pantalla.

## Seguridad

La API HTTP del backend está protegida por una frontera de autenticación centralizada
(`ApiAccessGuard`) basada en una credential por dispositivo — no en confiar en `Origin`,
`User-Agent` ni IP localhost. Ver [`docs/security/API_ACCESS.md`](docs/security/API_ACCESS.md)
para el detalle completo: `API_ACCESS_MODE` (`development`/`production`), identidad de
dispositivo, credentials, bootstrap del primer cliente Electron, revocación y limitaciones del
modelo de seguridad local.

Un dispositivo ya autenticado puede emparejar dispositivos adicionales (mobile, otra laptop,
tablet) vía QR + código de verificación, sin reusar el bootstrap — ver
[`docs/security/PAIRING.md`](docs/security/PAIRING.md).

Los dispositivos ya registrados se administran vía `/auth/devices/*` (listado, consulta,
renombrado, `/me`, revocación permanente — sin reactivación posible) — ver
[`docs/security/DEVICE_MANAGEMENT.md`](docs/security/DEVICE_MANAGEMENT.md). Solo el dispositivo
administrador de la instalación (el creado por bootstrap) puede administrar otros dispositivos.
Todo esto está implementado a nivel de backend; todavía no tiene interfaz en el frontend (ver
[Alcance de esta etapa](#alcance-de-esta-etapa)).

Variables de entorno (`apps/backend/.env.example`):

```env
API_ACCESS_MODE=development         # development = abierto | production = credential obligatoria
PAIRING_EXPIRATION_MINUTES=5        # duración de una sesión de pairing (QR + código)
# PAIRING_HOST=192.168.1.100        # override del host embebido en el QR (default: autodetectado)
```

`API_ACCESS_MODE` viene en `development` por defecto (pensado para no interrumpir el flujo de
desarrollo) — cualquier instalación real debe fijarlo explícitamente en `production` para que la
API exija credential.

## Notas técnicas / gotchas ya resueltos

- **No usar `composite: true` + `references` en el tsconfig de una app** (solo en packages
  consumidos como librería). Se probó en `apps/backend` y rompía silenciosamente
  `nest start --watch` (compilaba "0 errores" pero nunca emitía `dist/main.js`).
- **CORS es obligatorio** en el backend para que el renderer de Electron pueda consumirlo — son
  orígenes distintos aunque corran en la misma máquina.
- **pnpm bloquea scripts de build nativos por defecto** (`better-sqlite3`, `electron`, `esbuild`);
  están aprobados explícitamente en `pnpm-workspace.yaml` (`onlyBuiltDependencies` +
  `allowBuilds`).
- **Testing Library no limpia el DOM automáticamente entre tests con Vitest** (a diferencia de
  Jest) salvo que se llame `cleanup()` explícitamente — ver
  `apps/desktop/renderer/src/test/setup.ts`.

## Alcance de esta etapa

El backend tiene lógica de negocio real y testeada para **Productos, Categorías, Proveedores,
Compras, Ventas y Movimientos de stock**, además de autenticación de dispositivos y pairing
completos. El frontend tiene interfaz real para **Productos** y **Ventas**. Todavía **no incluye**:

- Interfaz de **Compras**, **Inventario** (historial de movimientos) y **Clientes** — el backend
  de Compras y Movimientos de stock ya está completo (ver [Inventario](#inventario)); solo falta
  construir la UI. Son páginas placeholder en el frontend
  (`apps/desktop/renderer/src/features/{purchases,inventory,customers}/`).
- Lógica de negocio de **Usuarios y Permisos** — siguen siendo placeholders estructurales también
  a nivel de backend (`apps/backend/src/core/{users,permissions}/`), ver
  [`apps/backend/src/core/README.md`](apps/backend/src/core/README.md).
- Empaquetado de producción (`electron-builder` / instalador) — no hay forma de distribuir la app
  fuera de este repositorio en modo desarrollo todavía.
- Autorización granular (roles/permisos), UI de Device Management, generación de QR en la UI de
  Electron/React, cliente Android/iOS real, descubrimiento automático de red (mDNS), sesiones de
  usuario, login con usuario/contraseña — la autenticación de dispositivo (`API_ACCESS_MODE`,
  credentials, bootstrap, pairing, administración de dispositivos vía API) sí está implementada,
  ver [Seguridad](#seguridad).
- Backup, restore o exportación de datos — un único archivo SQLite, sin copia de seguridad
  automática ni manual todavía.
- Reportes y dashboard de negocio — el panel actual solo muestra el estado de conexión con el
  backend (`/health`).
- Plugins reales (WhatsApp, persistencia externa, etc.) — solo documentados en `plugins/README.md`.
- Sincronización, servidor remoto/LAN, mobile, IA.

Todo lo anterior queda documentado como dirección futura, no implementado.
