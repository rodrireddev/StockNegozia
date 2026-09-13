# StockNegozia

Plataforma modular de gestión empresarial. Este repositorio contiene la **infraestructura base**
del proyecto (Etapa 1): monorepo, aplicación de escritorio (Electron + React) y backend (NestJS +
Drizzle + SQLite), ya conectados y funcionando de punta a punta. **Todavía no incluye lógica de
negocio** (productos, ventas, compras, clientes, etc.) — ver
[`apps/backend/src/core/README.md`](apps/backend/src/core/README.md) y
[`plugins/README.md`](plugins/README.md) para la dirección futura.

## Estado actual

- ✅ Monorepo pnpm + Turborepo funcionando (`typecheck`, `lint`, `build`, `format` limpios en las
  6 packages/apps).
- ✅ `pnpm dev` levanta Electron, que arranca el backend NestJS como proceso hijo, espera a
  `/health`, muestra la ventana con React, y detiene el backend al cerrar la app.
- ✅ Drizzle ORM conectado a SQLite real (`better-sqlite3`, compilado nativo), con una migración
  generada y aplicada automáticamente contra una tabla de prueba (`app_meta`).
- ✅ UI de React (Tailwind + shadcn/ui) consumiendo `/health` en vivo vía TanStack Query, con
  routing (react-router-dom) y estado de UI en Zustand (sidebar colapsable).
- ⬜ Sin lógica de negocio, sin empaquetado de producción, sin autenticación — ver
  [Alcance de esta etapa](#alcance-de-esta-etapa).

## Arquitectura

```
Desktop (Electron)              Backend (NestJS)
  ├─ Main process    ──spawn──►    Core
  │   administra el              (Products, Inventory, Sales,
  │   ciclo de vida del           Purchases, Customers, Users,
  │   backend                     Permissions — placeholders)
  └─ Renderer (React)                  │
       consume la API HTTP             ▼
       del backend (CORS)        Drizzle ORM ──► SQLite
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
│   │   │   │   └── window.ts             creación del BrowserWindow
│   │   │   └── preload/
│   │   │       └── index.ts              contextBridge mínimo (backendBaseUrl, versions)
│   │   ├── renderer/
│   │   │   ├── index.html
│   │   │   └── src/
│   │   │       ├── app/                  App.tsx, router.tsx (createHashRouter)
│   │   │       ├── features/             products, inventory, sales, purchases, customers,
│   │   │       │                         dashboard — páginas placeholder
│   │   │       ├── components/ui/        shadcn: button, card, separator
│   │   │       ├── layouts/              MainLayout.tsx (sidebar + Outlet)
│   │   │       ├── stores/               ui-store.ts (Zustand: sidebar colapsable)
│   │   │       ├── hooks/                useHealth.ts (TanStack Query)
│   │   │       ├── lib/                  api-client.ts, query-client.ts, utils.ts (cn)
│   │   │       └── types/                global.d.ts (window.stockNegozia)
│   │   ├── electron.vite.config.ts       build de main/preload/renderer
│   │   ├── tailwind.config.ts / components.json
│   │   └── package.json
│   │
│   └── backend/                          @stocknegozia/backend — NestJS
│       ├── src/
│       │   ├── main.ts                   bootstrap, CORS, puerto configurable
│       │   ├── app.module.ts             ConfigModule, EventEmitterModule, Database/Core/Health
│       │   ├── config/                   configuration.ts (env+data dir), ensure-data-dirs.ts
│       │   ├── database/                 database.module.ts (Drizzle+SQLite), schema/, migrations/
│       │   ├── core/                     CoreModule + 7 módulos de dominio (placeholders)
│       │   │                             ver core/README.md para la dirección futura
│       │   └── health/                   GET /health con roundtrip real a SQLite
│       ├── drizzle.config.ts             config de drizzle-kit (generate)
│       ├── nest-cli.json
│       └── package.json
│
├── packages/
│   ├── shared/            @stocknegozia/shared — AppInfo, APP_NAME, DEFAULT_BACKEND_PORT
│   ├── api-contracts/     @stocknegozia/api-contracts — HealthStatus (contrato back↔front)
│   ├── validation/        @stocknegozia/validation — backendEnvSchema (zod)
│   └── config/            @stocknegozia/config — tsconfig (base/node/react), eslint, prettier
│
├── plugins/
│   └── README.md          documenta el futuro Plugin Manifest/SDK/Runtime — sin código aún
│
├── tooling/
│   └── README.md          placeholder para scripts futuros del monorepo (vacío)
│
├── package.json           scripts raíz (dev/build/lint/typecheck/format) vía Turborepo
├── pnpm-workspace.yaml     apps/*, packages/*; onlyBuiltDependencies/allowBuilds para
│                           better-sqlite3, electron, esbuild
├── turbo.json              pipeline: build (dependsOn ^build), dev (persistent), lint, typecheck
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
- **`zod`** en `packages/validation` para validar el entorno del backend.
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
pnpm format      # prettier --write
pnpm format:check
```

Scripts propios de cada app (`pnpm --filter <nombre> <script>`):

- `@stocknegozia/backend`: `build`, `start:dev` (nest watch), `start:prod` (`node dist/main.js`),
  `dev`, `typecheck`, `lint`, `db:generate` (drizzle-kit).
- `@stocknegozia/desktop`: `dev`, `build`, `preview`, `typecheck`, `lint`.

## Base de datos

SQLite se almacena fuera del directorio de instalación, en el directorio de datos de usuario del
sistema operativo (`app.getPath('userData')` cuando corre bajo Electron; `./data` cuando el backend
corre de forma independiente). Dentro de ese directorio, el backend crea `database/`, `config/`,
`logs/` y `plugins/` (ver `apps/backend/src/config/`).

Para generar una nueva migración tras modificar el schema de Drizzle (`apps/backend/src/database/schema/`):

```bash
pnpm --filter @stocknegozia/backend db:generate
```

Las migraciones (`apps/backend/src/database/migrations/`) se aplican automáticamente al iniciar el
backend (se resuelven desde el árbol fuente, no desde `dist/`, para evitar condiciones de carrera
con el watcher de `nest start --watch`).

## Notas técnicas / gotchas ya resueltos

- **No usar `composite: true` + `references` en el tsconfig de una app** (solo en packages
  consumidos como librería). Se probó en `apps/backend` y rompía silenciosamente
  `nest start --watch` (compilaba "0 errores" pero nunca emitía `dist/main.js`).
- **CORS es obligatorio** en el backend para que el renderer de Electron pueda consumirlo — son
  orígenes distintos aunque corran en la misma máquina.
- **pnpm bloquea scripts de build nativos por defecto** (`better-sqlite3`, `electron`, `esbuild`);
  están aprobados explícitamente en `pnpm-workspace.yaml` (`onlyBuiltDependencies` +
  `allowBuilds`).

## Alcance de esta etapa

Esta primera etapa se limita a la infraestructura: monorepo, arranque de Electron+React+NestJS,
conexión real a SQLite vía Drizzle (con una tabla de prueba `app_meta`), y puntos de extensión
limpios para Core, Plugins y Event Bus. **No incluye**:

- Lógica de negocio (productos, inventario, ventas, compras, clientes, usuarios, permisos reales).
- Empaquetado de producción (`electron-builder` / instalador).
- Autenticación, autorización, dispositivos, sesiones.
- Plugins reales (WhatsApp, persistencia externa, etc.) — solo documentados en `plugins/README.md`.
- Sincronización, servidor remoto/LAN, mobile, IA.

Todo lo anterior queda documentado como dirección futura, no implementado.
#   S t o c k N e g o z i a  
 