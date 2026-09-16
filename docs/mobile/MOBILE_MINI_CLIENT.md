# Mobile Mini Client

`apps/mobile-mini` — versión standalone de StockNegozia para celular/tablet: **misma idea de
negocio que el resto del monorepo, pero sin backend y sin administración de dispositivos**. Es una
app de un solo dispositivo, con toda la data en una base SQLite local — no habla con
`apps/backend` ni con ningún servidor, y por lo tanto no tiene pairing, auth, ni concepto de
"dispositivos" para administrar.

No reemplaza a `apps/mobile` (que sigue siendo el cliente LAN pareado con el backend, para
instalaciones con Desktop): son dos apps Android independientes (identidad, package y slug
propios) pensadas para escenarios distintos — `mobile-mini` para quien no quiere/necesita correr
un backend en absoluto.

## Alcance

Productos (con scanner y foto), Ventas (carrito), Compras (carrito), Inventario (categorías +
historial de movimientos de stock), Proveedores. Ajustes es únicamente el selector de tema
claro/oscuro/sistema. Deliberadamente **sin** Panel/Dashboard ni Dispositivos — ninguno de los dos
existía tampoco en `apps/mobile`.

## Arquitectura

- **Storage**: `expo-sqlite` + `drizzle-orm` (driver `drizzle-orm/expo-sqlite`, síncrono — mismo
  patrón `db.transaction(tx => ...)` que usa el backend con `better-sqlite3`). Migraciones
  generadas con `drizzle-kit generate` (`pnpm db:generate`) y aplicadas en runtime con
  `useMigrations()` (`drizzle-orm/expo-sqlite/migrator`) en `app/_layout.tsx`, antes de esconder el
  splash.
- **Metro + Babel**: `metro.config.js` agrega `"sql"` a `resolver.sourceExts` y `babel.config.js`
  usa `babel-plugin-inline-import` para que las migraciones (`.sql`) se empaqueten como el string
  crudo de su contenido — ver [Drizzle · Expo SQLite](https://orm.drizzle.team/docs/sqlite/connect-expo-sqlite).
  Ninguno de los dos archivos existe en `apps/mobile` porque esa app no tiene base local propia.
- **Capa de datos** (`src/features/<módulo>/data/{repository,service}.ts`): réplica 1:1 de las
  reglas de negocio de `apps/backend/src/core/<módulo>/*` sobre el driver local, sin NestJS
  (funciones planas, sin DI). El invariante más importante se preserva igual: **una sola función**
  (`productsService.adjustStock`, `src/features/products/data/service.ts`) es el único punto que
  escribe `products.stock` y el único que inserta filas en `stock_movements` — la usan la creación
  de producto con stock inicial, Ventas, cancelación de ventas, Compras y los ajustes manuales.
  `src/data/*.ts` expone funciones con las mismas firmas que
  `apps/mobile/src/api/endpoints/*.ts` (`fetchProducts`, `createSale`, etc.) pero contra esta capa
  local en vez de HTTP — así los hooks de React Query se copiaron del cliente completo cambiando
  solo el import.
- **UI**: `theme/`, `components/`, `hooks/`, `navigation/AdaptiveShell.tsx`,
  `features/scanner/` y `features/products/components/ProductPhotoCapture.tsx` son copias
  verbatim de `apps/mobile` (no dependen de `api/`/`auth/`/`devices/`). Los formularios/pantallas de
  Productos, Ventas, Compras, Proveedores e Inventario también se copiaron de `apps/mobile` y solo
  se les quitó `useAuthErrorRedirect` (no hay 401 que manejar) y se les cambió el import de datos.
- **Se descartó por completo**: `auth/`, `devices/`, `features/pairing/`, el cliente HTTP
  (`api/client.ts`), `config/backendUrlStore.ts`, `config/termsStore.ts`,
  `expo-secure-store`/`expo-device`, y los campos `deviceId`/`deviceName`/`deviceType`/`requestId`
  de `stock_movements` (sin contexto HTTP ni dispositivos múltiples que trazar — el historial de
  movimientos sigue mostrando lo mismo, simplemente sin la línea "Vendedor: …").

## Reutilizado sin cambios de `@stocknegozia/*`

- `shared`: `cartReducer`/`purchaseCartReducer`, `resolveScanMatch`, `countProductsByCategory`,
  `movement-labels.ts`.
- `validation`: todos los schemas Zod (`product`, `sale`, `purchase`, `supplier`,
  `stock-adjustment`, `stock-movement`) — validan forma/tipos, no HTTP, sirven igual para
  escrituras locales.
- `api-contracts`: los tipos DTO (`ProductDto`, `SaleDto`, `PurchaseDto`, `SupplierDto`,
  `CategoryDto`, `StockMovementDto`) como contrato de retorno de la capa de datos local.

## Comandos

```bash
pnpm --filter @stocknegozia/mobile-mini db:generate   # regenerar migraciones tras tocar el schema
pnpm --filter @stocknegozia/mobile-mini dev            # expo start
pnpm --filter @stocknegozia/mobile-mini typecheck
pnpm --filter @stocknegozia/mobile-mini lint
pnpm --filter @stocknegozia/mobile-mini test
```

## Estado / pendientes

- Verificado: `typecheck`, `lint`, la suite de Jest existente (theme/hooks copiados) y un
  `expo export -p android` completo (bundlea los ~3500 módulos de la app sin errores). **No** se
  corrió todavía en un dispositivo/emulador real — pendiente antes de un build de producción.
  El emulador Android de este equipo está documentado en `docs/mobile/MOBILE_CLIENT.md` §Entorno
  de emulador.
- Sin tests automatizados propios para `features/*/data/service.ts` (las reglas de
  `adjustStock`/Ventas/Compras): `expo-sqlite` es un módulo nativo sin mock funcional en
  `jest-expo`, así que ejercitar esa capa en Jest requeriría un adaptador propio contra
  `better-sqlite3`. La lógica es un port literal de `apps/backend/src/core/*`, que sí tiene
  cobertura completa ahí — cualquier divergencia de comportamiento debería detectarse comparando
  contra esos tests.
- Íconos/splash (`assets/images/*`) son un placeholder copiado de `apps/mobile` — reemplazar antes
  de publicar.
- `extra.eas.projectId` en `app.json` es un placeholder (`REPLACE_WITH_EAS_PROJECT_ID`) — sin
  cuenta EAS configurada en este entorno, mismo estado que `apps/mobile`.
