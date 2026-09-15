# Mobile Client (M15)

Cliente móvil oficial de StockNegozia para Android (teléfonos y tablets) — React Native + Expo +
TypeScript, preparado para publicación en Google Play. Complementa la documentación existente:

- [`docs/security/API_ACCESS.md`](../security/API_ACCESS.md) — modelo de autenticación (`Device`,
  `credential`, `ApiAccessGuard`).
- [`docs/security/PAIRING.md`](../security/PAIRING.md) — flujo de pairing (QR + código).
- [`docs/security/DEVICE_MANAGEMENT.md`](../security/DEVICE_MANAGEMENT.md) — administración de
  dispositivos, revocación.
- [`docs/lan/DEVICE_MANAGEMENT.md`](../lan/DEVICE_MANAGEMENT.md) — pairing real end-to-end desde un
  segundo cliente (Web Client, M14) — Mobile sigue exactamente el mismo modelo.

Ninguno de estos sistemas se modificó para M15. El backend de Device Auth/Pairing/CORS quedó
intacto — Mobile es, para el backend, un `Device` más (`type: "mobile" | "tablet"`).

## Stack y versiones

|              | Versión | Motivo                                                                         |
| ------------ | ------- | ------------------------------------------------------------------------------ |
| Expo SDK     | 57      | Última estable al momento de esta implementación (sept. 2026).                 |
| React Native | 0.86.3  | Viene con Expo SDK 57.                                                         |
| React        | 19.2.3  | Viene con Expo SDK 57.                                                         |
| TypeScript   | ~6.0.3  | Versión que exige el template de Expo SDK 57 — ver §Divergencia de TypeScript. |

No se fijaron versiones "a ojo": se verificó contra el registro de npm y contra
`expo install --check` / `expo-doctor` (21/21 checks en verde) antes de cerrar la implementación.

### Google Play / Android — requisitos verificados

- **Target API level**: Google Play exige Android 16 (API 36) para apps/actualizaciones nuevas
  desde el 31/08/2026. Expo SDK 57 usa **`compileSdkVersion`/`targetSdkVersion` 36 por defecto** —
  no hace falta ningún override.
- **16 KB memory page size**: requisito de Google Play para apps que targetean Android 15+. React
  Native lo soporta desde la 0.77 (Expo SDK 53+); SDK 57 (RN 0.86) lo cumple sin configuración
  adicional. No se agregó ninguna dependencia nativa de terceros que pudiera romper esta
  compatibilidad (ver §Dependencias).
- **Android App Bundle**: el perfil `production` de EAS genera `.aab` (ver §Builds).
- **Edge-to-edge**: Android 15+ lo exige por defecto; Expo SDK 57 ya no expone un toggle
  `edgeToEdgeEnabled` en `app.json` porque es el único comportamiento soportado — no se necesita
  configuración.

## Arquitectura de carpetas

```text
apps/mobile/
├── app.json                 # identidad de la app, ícono, splash, plugins
├── eas.json                 # perfiles de build: development / preview / production
├── src/
│   ├── app/                 # expo-router (file-based routing) — pantallas FINAS
│   │   ├── _layout.tsx      # providers (QueryClient, Auth, SafeArea) + splash
│   │   ├── index.tsx        # gate: redirige a /pairing o /products
│   │   ├── pairing.tsx
│   │   └── (app)/           # grupo autenticado
│   │       ├── _layout.tsx  # guard de auth + AdaptiveShell (nav)
│   │       ├── products/
│   │       └── device/
│   ├── api/                 # cliente HTTP genérico + endpoints tipados
│   ├── auth/                # CredentialStore, AuthContext, manejo de 401
│   ├── devices/             # datos del dispositivo propio (GET /auth/devices/me)
│   ├── features/
│   │   ├── pairing/         # wizard de 5 pasos (components/steps/), parseo del QR, mutación
│   │   ├── products/        # hook de listado, item de lista, pantalla
│   │   └── scanner/         # contrato ScanResult para el FUTURO scanner de productos — ver §Scanner
│   ├── components/          # primitivos de UI (Button, Card, Checkbox, EmptyState, ...)
│   ├── navigation/          # AdaptiveShell (bottom bar / side rail)
│   ├── config/              # env.ts, backendUrlStore.ts, termsStore.ts
│   ├── theme/                # tokens de color/spacing/tipografía
│   └── hooks/                # useDeviceSize (phone/tablet)
└── scripts/
    └── generate-branding-assets.mjs
```

La separación real es la que pedía el milestone: **API / AUTH / DEVICES / FEATURES / UI / CONFIG /
TYPES** (los tipos viven en `@stocknegozia/api-contracts`, reutilizados — ver más abajo). No hay un
archivo gigante concentrando toda la app; cada pantalla de `src/app/` es un one-liner que
re-exporta la screen real de `src/features/*/screens/`.

## Qué se reutilizó del monorepo y qué no

**Reutilizado sin cambios**:

- `@stocknegozia/api-contracts` — `DeviceDto`, `DeviceType`, `PairingQrPayload`,
  `PairingConfirmResult`, `ProductDto`, etc. Cero contratos nuevos: Mobile no necesitó ningún tipo
  que no existiera ya. No se modificó ese paquete.
- `@tanstack/react-query` — misma librería que usa Desktop, con soporte oficial para React Native.
- El patrón de arquitectura por features (`api/ hooks/ components/ pages|screens/`) que ya usa
  Desktop (`apps/desktop/renderer/src/features/*`).
- `@stocknegozia/config/eslint/base.js` — reglas base de ESLint (typescript-eslint recomendado),
  extendidas a mano con `eslint-plugin-react-hooks`.

**No reutilizado — decisión explícita, no accidente**:

- **Tailwind / shadcn / Radix** (Desktop): sin soporte real en React Native. En vez de forzarlos
  (NativeWind + wrappers de Radix inexistentes), se portaron los **tokens** de
  `apps/desktop/renderer/src/index.css` (paleta HSL slate) a `src/theme/colors.ts` como hex, y se
  construyeron primitivos propios (`Button`, `Card`, `TextField`, ...) con `StyleSheet`. Misma
  identidad visual, implementación nativa.
- **`@stocknegozia/config/typescript/react.json`**: asume DOM + Vite (`moduleResolution: Bundler`,
  `lib: [DOM]`). Mobile extiende `expo/tsconfig.base` en su lugar (resolución de módulos y JSX
  correctos para Metro/Hermes), sumando `strict` + `noUncheckedIndexedAccess` a mano para mantener
  el mismo nivel de rigurosidad que el resto del monorepo.
- **Vitest**: no simula el runtime nativo (no hay `TurboModuleRegistry`, `NativeEventEmitter`,
  etc.). Se usó **`jest-expo`** — el preset oficial de Expo para tests, que sí lo hace.
- **Zustand**: no fue necesario. El único estado global real es el de autenticación
  (`AuthContext`, `React.Context` + `useState`) — agregar una librería de estado para eso hubiera
  sido sobre-ingeniería (ver Milestone §29 "no sobre-ingeniería").
- **`lucide-react` (Desktop)** → **`lucide-react-native`**: mismo set de íconos, paquete con
  soporte real para RN (requiere `react-native-svg`, agregado). Consistencia visual sin forzar el
  paquete web.

## Divergencia de TypeScript

El resto del monorepo fija `typescript: ^5.7.2`. `apps/mobile` usa `~6.0.3` porque es lo que
resuelve el template oficial de Expo SDK 57 (`create-expo-app`) — forzar `5.7.2` ahí es exactamente
el tipo de "compatibilidad forzada" que el milestone pide evitar. `packages/*` (que si comparten
`typescript: ^5.7.2`) no se ven afectados: Mobile los consume ya compilados (`dist/*.d.ts`), nunca
comparte el mismo proceso de `tsc`.

## Configuración — dev / preview / production

A diferencia del Web Client (`VITE_API_URL`, fijo en build-time porque el dev server de Vite corre
en la misma sesión que se está probando), Mobile **no puede** resolver la IP del backend en
build-time para preview/production: cada instalación de StockNegozia corre en una LAN distinta y no
hay descubrimiento de red (ver `docs/security/PAIRING.md` §Host/red — deliberadamente fuera de
alcance). Por eso hay dos mecanismos, no uno:

1. **`EXPO_PUBLIC_API_URL`** (`.env`, ver `.env.example`) — conveniencia solo para `expo start` en
   desarrollo. Se lee una vez al arrancar Metro.
2. **URL persistida en el dispositivo** (`src/config/backendUrlStore.ts`, `AsyncStorage` — no es un
   secreto, es una IP LAN) — la fuente de verdad real en preview/production.

**La persona nunca escribe esta URL a mano.** El QR de pairing ya trae `host`/`port`
(`PairingQrPayload`, resueltos por `resolveLanHost()` del lado del backend) — al escanearlo,
`parsePairingPayload()` arma `backendUrl` automáticamente y el wizard de pairing la persiste antes
de confirmar (ver §Pairing). No existe ningún campo de "URL del backend" en ninguna pantalla: es un
detalle de red interno, no algo que el usuario del celular tenga que conocer. Esto es lo que
permite que un mismo `.aab` funcione en instalaciones distintas sin recompilar y sin pedirle nada
a la persona más que escanear el QR.

`src/config/env.ts` + `src/config/backendUrlStore.ts` implementan esta separación.

## LAN

Sin cambios de arquitectura de red: el backend ya escucha en todas las interfaces
(`docs/lan/LAN_TESTING.md`), y `resolveLanHost()` ya imprime la IP correcta al arrancar. Un
teléfono Android real (no el emulador) necesita esa IP LAN — nunca `localhost` (eso apuntaría al
propio teléfono). El emulador de Android sí podría usar `10.0.2.2` para llegar al host, pero como
el producto es LAN-first y la prueba real es con un dispositivo físico (ver Milestone §34), no se
documentó ese atajo como el camino principal.

## CORS

**No se tocó.** `fetch` de React Native no es un navegador: no envía header `Origin`, así que
`createCorsOriginValidator()` (`apps/backend/src/config/cors-origin.ts`) ya lo permite sin
modificaciones (`if (!origin) return callback(null, true)`). Debilitar CORS para "hacer andar" el
móvil hubiera sido innecesario y es exactamente lo que el milestone pide no hacer.

## Pairing

Reutiliza el mecanismo existente sin ningún cambio de contrato. La UI es un wizard lineal de 5
pasos (`src/features/pairing/screens/PairingScreen.tsx`), no un formulario único:

```
1. Instrucciones      — cómo generar el QR desde el Desktop
2. Términos de uso     — aceptación simulada (ver nota más abajo), una sola vez por instalación
3. Escanear QR         — cámara real (expo-camera), reemplaza el "pegar JSON" de M15
4. Código de verificación
5. Nombre del dispositivo → recién acá se confirma el pairing

Desktop → POST /auth/pairing → QR + verificationCode
Mobile  → escanea el QR con la cámara → parsePairingPayload() valida el payload y arma
          backendUrl automáticamente (host/port ya vienen en el QR, ver §Configuración)
        → POST /auth/pairing/confirm { pairingId, token, verificationCode, deviceName?, deviceType }
        → { device, credential }        (única vez que se revela)
Mobile  → guarda `credential` con SecureStore, recién ahí queda "sincronizado"
```

`deviceType` se infiere del ancho de pantalla (`useDeviceSize().isTablet`) al momento de emparejar
— `mobile` o `tablet`, el mismo enum que ya acepta el backend. `src/features/pairing/`:

- `parsePairingPayload.ts` — valida `version === 1` y que `host`/`port`/`protocol` estén presentes
  (hacen falta para armar `backendUrl`); ya no ignora esos campos como hacía
  `apps/web-client/src/pairing.ts` (correcto ahí, porque el Web Client corre en la misma LAN que se
  está probando — Mobile no tiene esa garantía).
- `components/steps/` — un componente por paso del wizard: `InstructionsStep`, `TermsStep`,
  `ScanStep` (cámara), `VerifyStep`, `NameStep`. Cada uno solo conoce su propio paso; el estado
  compartido (el payload escaneado, el código, el nombre) vive en `PairingScreen`.
- `hooks/usePairDevice.ts` — mutación de React Query sobre `AuthContext.pair()`, disparada recién
  en el último paso (`NameStep`).

### Escaneo de QR (cámara real)

`ScanStep.tsx` usa `expo-camera` (`CameraView` + `useCameraPermissions`), no una librería de
terceros — es el módulo oficial de Expo y ya cubre detección de QR nativamente
(`barcodeScannerSettings={{ barcodeTypes: ["qr"] }}`), sin necesitar `expo-barcode-scanner`
(deprecado/fusionado en `expo-camera` desde hace varias versiones de Expo).

- Permiso `CAMERA` — ver `app.json` (`plugins: [["expo-camera", { recordAudioAndroid: false }]]`).
  `recordAudioAndroid: false` evita que el plugin agregue `RECORD_AUDIO`, que no hace falta: nunca
  se graba audio ni video, solo se lee el QR en vivo.
- Un QR inválido (JSON mal formado, `version` distinta, o sin `host`/`port`/`protocol`) muestra un
  mensaje y permite reintentar sin salir de la pantalla — nunca crashea ni bloquea el flujo.
- El contrato genérico de escaneo preparado a futuro (`src/features/scanner/types.ts`,
  `ScanResult { code, format }`) sigue existiendo para cuando se implemente el escaneo de
  productos/barcodes (EAN, Code128, etc.) — eso **todavía no está implementado**; lo que se agregó
  acá es específicamente el escaneo del QR de pairing, con `expo-camera` directamente en
  `ScanStep`, no a través de ese contrato genérico (son necesidades distintas: pairing necesita el
  JSON completo del QR, no un código/formato simple).

### Términos de uso (simulados)

StockNegozia todavía no tiene un texto legal real. `TermsStep.tsx` muestra un texto de ejemplo,
claramente marcado como placeholder en el propio código, con un checkbox de aceptación obligatorio
antes de continuar. La aceptación se persiste una sola vez (`src/config/termsStore.ts`,
`AsyncStorage` — no es un dato sensible) para no volver a pedirla si la persona repite el wizard
(por ejemplo, tras "Olvidar este dispositivo"). **Reemplazar por el texto legal definitivo antes de
publicar en Google Play** — ver §Privacy / Data Safety.

## Credential storage

`src/auth/CredentialStore.ts` define la interfaz:

```ts
interface CredentialStore {
  getCredential(): Promise<string | null>;
  setCredential(credential: string): Promise<void>;
  clearCredential(): Promise<void>;
}
```

`SecureCredentialStore.ts` es la única implementación — `expo-secure-store` (Android Keystore /
`EncryptedSharedPreferences`). **Nunca `AsyncStorage`** para la credential (sí se usa para la URL
del backend, que no es un secreto — ver §Configuración). La abstracción permite reemplazar el
backend de storage sin tocar `AuthContext` ni ninguna pantalla.

Invariantes de seguridad (auditadas manualmente en el código, no solo declaradas):

- Ningún `console.log`/`console.error` incluye la credential, el pairing token, ni el verification
  code en ningún archivo de `src/`.
- Los mensajes de error mostrados al usuario (`AuthRequiredError`, `NetworkError`) son genéricos —
  nunca interpolan el valor de la credential ni el body crudo de una respuesta 401.
- `SecureCredentialStore` nunca propaga el valor en una excepción: si `SecureStore` falla, se
  devuelve `null`/no-op, no un error con contexto.

## API Client

`src/api/client.ts` — wrapper delgado sobre `fetch`, mismo criterio que
`apps/desktop/renderer/src/lib/api-client.ts` y `apps/web-client/src/api.ts`: sin librería de HTTP
nueva (no Axios). Responsabilidades:

- Arma la URL con la del backend configurada (`getBackendUrl()`).
- Adjunta `Authorization: Bearer <credential>` si hay una guardada.
- Distingue tres familias de error: `BackendNotConfiguredError` (nunca se configuró la URL),
  `NetworkError` (backend inalcanzable — `fetch` rechaza), `AuthRequiredError` (401 — ver más
  abajo). Nunca se confunden entre sí.

## 401 / revocación

`ApiAccessGuard` devuelve siempre el mismo `401` genérico (credential ausente, inválida, o de un
dispositivo revocado) — **no se intenta distinguir el motivo del lado del cliente**, exactamente
igual que el Web Client. Cualquier `401`:

1. Limpia la credential guardada (`src/api/client.ts`).
2. `useAuthErrorRedirect(error)` (usado en `ProductsScreen`/`DeviceScreen`) detecta el
   `AuthRequiredError` y llama `AuthContext.signOut()`.
3. El layout de `(app)` (`src/app/(app)/_layout.tsx`) redirige a `/pairing` en el siguiente render.

No existe ningún mecanismo de reactivación (tampoco lo hay en el backend) — la única salida es un
pairing nuevo.

## UI / Design System

Mobile-first, no "Desktop encogido":

- **Touch targets** ≥ 48dp (`minTouchTarget` en `src/theme/tokens.ts`) en botones, tabs e inputs.
- **Estados** cubiertos explícitamente en cada pantalla con datos remotos: loading
  (`LoadingState`), error con reintento (`ErrorState`), vacío (`EmptyState`).
- **Teclado**: `KeyboardAvoidingView` en el formulario de pairing; `keyboardShouldPersistTaps` en
  los `ScrollView` con inputs.
- **Splash real**: `expo-splash-screen` se mantiene visible hasta que `AuthContext` resuelve si hay
  una credential válida — nunca hay un flash de contenido incorrecto.

### Phone + Tablet

`useDeviceSize()` (`src/hooks/useDeviceSize.ts`) expone `isTablet`/`isLandscape` a partir de
`useWindowDimensions()` (reacciona a rotación, no solo al modelo de dispositivo) con un breakpoint
de 768dp. La lógica de clasificación está separada en una función pura (`computeDeviceSize`) para
poder testearla sin mockear React Native.

`AdaptiveShell` (`src/navigation/AdaptiveShell.tsx`) es el único lugar que usa ese breakpoint para
cambiar de **chrome**, no de lógica:

- Teléfono: bottom tab bar.
- Tablet: side rail persistente (220dp) + contenido a la derecha.

`ProductsScreen` reutiliza el mismo breakpoint para pasar de lista (1 columna) a grilla (2
columnas) en tablet.

No se implementó (ni hacía falta para M15) un layout de tablet más elaborado — la arquitectura
(`AdaptiveShell` + `useDeviceSize`) no impide agregarlo después.

### Qué no se hizo (a propósito)

Optimización profunda de UX/UI mobile (densidad, patrones de navegación específicos,
accesibilidad exhaustiva, comparación con apps similares) es explícitamente un milestone posterior
("Mobile UX/UI Optimization"). M15 entrega una base visual coherente y funcional, no el resultado
de esa investigación.

## Scanner de cámara

**El escaneo del QR de pairing SÍ está implementado** (ver §Pairing → Escaneo de QR) —
`expo-camera`, permiso `CAMERA` real declarado vía el plugin de `expo-camera` en `app.json`. Esto
reemplaza al "pegar el JSON" que usaba M15 originalmente (documentado ahí como decisión deliberada
para no implementar cámara en ese momento — se revirtió en un fix posterior a pedido explícito,
ver el historial de commits).

**Lo que sigue sin implementarse**: el escaneo de códigos de producto (barcode/EAN/UPC/Code128)
para altas rápidas de inventario — un feature distinto, de otro milestone. `Products` no depende
de ninguna librería de cámara.

`src/features/scanner/types.ts` define el contrato preparado para ESE caso futuro:

```ts
interface ScanResult {
  code: string;
  format: string;
}
```

`features/pairing` no usa este contrato — el escaneo de pairing necesita el JSON completo del QR
(`PairingQrPayload`), no un `{code, format}` simple, así que `ScanStep.tsx` usa `expo-camera`
directamente. Cuando se implemente el escaneo de productos, va a producir un `ScanResult` y
entregárselo a `features/products` sin que ese feature necesite saber qué librería de cámara se
usó — la misma separación que ya existía, ahora con un precedente real (`ScanStep`) de cómo se ve
un feature de cámara integrado en esta arquitectura.

## Products

`GET /products` sin filtros — alcanza para demostrar la cadena completa (credential → request
autenticada → backend → datos reales) sin construir el CRUD completo de inventario, que ya existe
en Desktop y no es objetivo de M15. `ProductListItem` reutiliza `stockStatus`
(`normal | low | out`) del contrato existente, sin inventar un estado nuevo.

## Testing

`jest-expo` + `@testing-library/react-native` (v14 — su `render()` es **async**, algo a tener en
cuenta al escribir tests nuevos: `const view = await render(<X />)`).

Cobertura mínima (ver `src/**/*.spec.{ts,tsx}`):

- **CredentialStore** (`SecureCredentialStore.spec.ts`): guardar, recuperar, eliminar,
  comportamiento cuando no hay ninguna, comportamiento cuando `SecureStore` falla.
- **API** (`client.spec.ts`): header `Authorization` presente/ausente, GET/POST, parseo de
  errores, `NetworkError` vs. `AuthRequiredError` vs. `BackendNotConfiguredError`, 401 limpia la
  credential.
- **Pairing** (`parsePairingPayload.spec.ts`): parseo válido, JSON malformado, `version` incorrecta,
  campos faltantes/vacíos.
- **Auth** (`AuthContext.spec.tsx`): estado `unauthenticated` sin credential, `authenticated` con
  credential válida, vuelta a `unauthenticated` ante un 401 en el bootstrap.
- **UI** (`ProductsScreen.spec.tsx`): loading, error con retry, vacío, lista con datos reales.
- **Responsive** (`useDeviceSize.spec.ts`): clasificación tablet/phone, orientación — sobre la
  función pura, sin mockear internals de React Native.

Nota de infraestructura de testing (ver `jest.config.js`): `lucide-react-native` resuelve a un
build ESM (`.mjs`) bajo la condición `"react-native"` de su `package.json#exports` — correcto para
Metro (que sí procesa ESM), pero Jest necesitó una entrada adicional de `transform` +
`transformIgnorePatterns` para poder ejecutarlo. Documentado en el propio archivo de config.

## Builds

Workflow **managed** de Expo (sin carpetas `android/`/`ios/` versionadas — `expo prebuild` las
genera bajo demanda; ver `.gitignore`).

| Perfil        | Comando                 | Resultado           | Uso                                                       |
| ------------- | ----------------------- | ------------------- | --------------------------------------------------------- |
| `development` | `pnpm build:dev`        | APK con dev client  | Iterar con Fast Refresh en un dispositivo real.           |
| `preview`     | `pnpm build:preview`    | APK instalable      | Compartir para pruebas manuales (no requiere Play Store). |
| `production`  | `pnpm build:production` | `.aab` (App Bundle) | Subir a Google Play.                                      |

`eas.json` define los tres perfiles. `appVersionSource: "local"` — `version`/`versionCode` en
`app.json` son la fuente de verdad (`versionCode` se auto-incrementa en `production` vía
`autoIncrement`). No se subieron secretos a ningún archivo versionado: EAS maneja el keystore de
signing en su propia infraestructura (`eas credentials`), no hay ningún `.jks`/`.keystore` en este
repo.

### Pendiente para ejecutar un build real

Este entorno no tiene una cuenta/proyecto EAS configurado. Antes del primer build:

```bash
pnpm --filter @stocknegozia/mobile exec eas login
pnpm --filter @stocknegozia/mobile exec eas init
```

`eas init` va a completar `extra.eas.projectId` en `app.json` (hoy tiene un placeholder
`REPLACE_WITH_EAS_PROJECT_ID`).

## Privacy / Data Safety

Documentado para completar el formulario de Google Play cuando corresponda (no se completó acá,
ver Milestone §22 — "no inventar una declaración de Data Safety"):

| Dato                                             | ¿Se almacena en el dispositivo?                                                                                                | ¿Se envía al backend?                               | Detalle                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Device credential                                | Sí — cifrada (`expo-secure-store`, Android Keystore)                                                                           | Sí — header `Authorization` en cada request         | Nunca en texto plano, nunca en logs.                                                                      |
| URL del backend (IP LAN)                         | Sí — `AsyncStorage`, sin cifrar                                                                                                | No (es la dirección de destino, no un dato enviado) | Se arma automáticamente al escanear el QR (ver §Configuración) — la persona nunca la ve ni la escribe.    |
| Aceptación de términos                           | Sí — fecha/hora en `AsyncStorage` (`termsStore.ts`)                                                                            | No                                                  | Solo la marca de que se aceptó, no el texto en sí.                                                        |
| Nombre del dispositivo                           | No se persiste en el dispositivo más allá del formulario                                                                       | Sí — una vez, en `POST /auth/pairing/confirm`       | Elegido por la persona; puede ser el nombre real del teléfono si usa el valor sugerido por `expo-device`. |
| Imagen de la cámara (QR de pairing)              | No — el frame se procesa en memoria para leer el QR y se descarta de inmediato                                                 | No, nunca                                           | `expo-camera` solo se usa para detección de código en vivo; no se toman fotos ni se graba video.          |
| Datos de productos (nombre, precio, stock, etc.) | No — se piden en cada carga de pantalla, sin cache persistente entre sesiones de la app (solo cache en memoria de React Query) | Se reciben del backend (`GET /products`)            | Mismos datos que ya administra Desktop; no son datos personales de usuarios de la app.                    |
| Logs                                             | Solo logs de desarrollo (consola de Metro)                                                                                     | No aplica                                           | Nunca contienen credential/token/código — ver §Credential storage.                                        |

No se integró ningún SDK de analytics/telemetría/crash-reporting de terceros.

**Permiso `CAMERA`**: único permiso peligroso declarado (vía el plugin de `expo-camera`, ver
§Pairing → Escaneo de QR). Su uso está acotado a leer el QR de pairing en vivo — el formulario de
Data Safety de Play Console debe declarar "Cámara" con propósito "Funcionalidad de la app", sin
recolección ni compartición de esas imágenes.

## Entorno de emulador Android (para pruebas de este equipo)

Instalado ad-hoc en `C:\Android` (SDK, JDK 21 Temurin, un AVD `StockNegozia_Test` — Pixel 4,
Android 14/API 34, `google_apis/x86_64`) para poder correr y capturar pantallas de la app sin
depender de un dispositivo físico. Confirmado que **WHPX (Windows Hypervisor Platform) acelera el
emulador realmente** en esta máquina — no es software rendering puro. No forma parte del
repositorio ni de ningún script de CI: es infraestructura local de esta sesión de trabajo, no algo
que otra persona clonando el repo obtenga automáticamente. Quien quiera reproducirlo:

```bash
# SDK command-line tools + JDK 21 (Temurin) + un system image de API 34
sdkmanager --sdk_root=<ruta> "platform-tools" "platforms;android-34" \
  "system-images;android-34;google_apis;x86_64" "build-tools;34.0.0"
avdmanager create avd -n <nombre> -k "system-images;android-34;google_apis;x86_64" -d "pixel_4"
emulator -avd <nombre> -gpu swiftshader_indirect
```

## Riesgos / recomendaciones para M16

- **Build de producción real (`.aab`) no generado**: requiere una cuenta EAS (ver §Builds). No se
  puede demostrar el artefacto final sin credenciales del usuario.
- **`react-native-reanimated`/`react-native-worklets`**: quedaron en `package.json` porque son
  parte de la base que instala el template oficial de `expo-router` en SDK 57 (no una elección
  activa de este milestone) — no se usó ninguna animación en el código propio hasta ahora. Si no
  se necesitan, podrían removerse revisando primero que `expo-router`/`react-native-screens` no
  los requieran transitivamente.
- **Términos y condiciones simulados** (`TermsStep.tsx`): reemplazar por el texto legal real antes
  de publicar en Google Play — ver §Pairing → Términos de uso.
- **Escaneo de códigos de producto** (barcode/EAN/UPC para altas rápidas de inventario) sigue sin
  implementarse — es un feature distinto del escaneo de pairing (ver §Scanner de cámara), candidato
  natural para el próximo milestone, junto con la "Mobile UX/UI Optimization" ya mencionada.
