# Pairing de dispositivos (QR + código de verificación)

Complementa [`API_ACCESS.md`](./API_ACCESS.md) — léelo primero para el modelo general de
autenticación (`API_ACCESS_MODE`, `Device`, `credential`, `ApiAccessGuard`). Este documento cubre
específicamente cómo un dispositivo **ya autenticado** (típicamente el Electron desktop, emparejado
originalmente vía `/auth/bootstrap`) puede autorizar dispositivos adicionales — mobile, otra
laptop, una tablet — sin depender del flujo de bootstrap (que solo tiene sentido para el primer
dispositivo de una instalación).

## Por qué un mecanismo separado del bootstrap

El bootstrap (Milestone 5) resuelve un problema distinto: cómo el **primer** cliente de una
instalación obtiene una identidad, cuando todavía no existe ningún `Device`. El pairing resuelve
cómo un dispositivo **nuevo** se suma a una instalación que ya tiene al menos un dispositivo activo
— y a diferencia del bootstrap, quien inicia el proceso es un humano con acceso físico al desktop
ya autenticado, no el propio backend al arrancar sin dispositivos.

## Objetivo

```
Desktop StockNegozia (ya autenticado)
        │
        │ genera pairing
        ▼
   QR + código de verificación
        │
        ├───────────────┐
        │               │
     Android         Notebook
        │               │
        └───────┬───────┘
                │
                ▼
          NestJS Backend
                │
                ▼
          nuevo Device
                │
                ▼
       credential permanente
```

## Principio de seguridad: pairing token ≠ device credential

Son dos secretos completamente distintos, con ciclos de vida distintos:

| | Pairing token | Device credential |
| --- | --- | --- |
| Vida | Temporal (minutos) | Permanente |
| Uso | Un solo uso | Repetible, en cada request |
| Dónde viaja | Dentro del QR | Header `Authorization`, nunca en un QR |
| Qué autoriza | Confirmar **un** pairing | Autenticarse contra la API indefinidamente |
| Revocable | Se consume o expira solo | `DevicesService.revoke()` |

**El QR nunca contiene una credential permanente.** El pairing token que sí contiene es
intencionalmente inútil para cualquier otra cosa que no sea confirmar esa sesión de pairing
puntual, una única vez, dentro de la ventana de expiración — nunca se acepta como
`Authorization: Bearer <pairing token>` en ningún endpoint protegido (son tablas y hashes
completamente separados: `devices.credential_hash` vs. `pairing_sessions.token_hash`).

## Flujo

### 1. Crear un pairing — `POST /auth/pairing`

Requiere una credential válida (`Authorization: Bearer <credential>`) — no cualquiera puede generar
sesiones de pairing, solo un dispositivo ya autorizado. Público en `API_ACCESS_MODE=development`
igual que el resto de la API, como cualquier otro endpoint protegido.

Respuesta (`201`):

```json
{
  "pairingId": "53ffa658-8ead-439c-ad17-c886e4feb750",
  "verificationCode": "385273",
  "status": "pending",
  "expiresAt": "2026-09-14T05:36:54.681Z",
  "qr": {
    "version": 1,
    "type": "stocknegozia-pairing",
    "host": "192.168.1.30",
    "port": 38123,
    "protocol": "http",
    "pairingId": "53ffa658-8ead-439c-ad17-c886e4feb750",
    "token": "He6JDFgVjxHZcMCst4125NyqjlhInBot-aGm3hzg9iY",
    "expiresAt": "2026-09-14T05:36:54.681Z"
  }
}
```

- `qr` es el payload pensado para codificarse como QR (`PairingService.createPairing()` →
  `PairingPayload` → UI de Electron → QR — ver §UI/QR más abajo). Contiene el pairing token, nunca
  el `verificationCode`.
- `verificationCode` se muestra en pantalla en el propio desktop — la persona lo lee y lo tipea a
  mano en el dispositivo que está emparejando. Es el segundo factor: alguien que solo llegó a ver
  el QR (sin estar físicamente frente al desktop) no puede completar el pairing.
- `version: 1` en el payload del QR permite evolucionar el formato a futuro sin romper clientes
  viejos.

### 2. Host/red del QR

`localhost` no sirve desde un segundo dispositivo — el QR debe indicar una IP alcanzable en la
misma LAN. `PairingService` resuelve el host con `resolveLanHost()`
(`apps/backend/src/auth/pairing/lan-address.ts`): por defecto autodetecta la primera interfaz IPv4
no interna (`node:os.networkInterfaces()`); `PAIRING_HOST` permite forzar un valor cuando la
autodetección no elige la interfaz correcta (varias NICs activas, VPN, etc.). Esto **no** es
descubrimiento de red (mDNS ni similar) — eso queda para otro milestone; el cliente que escanea el
QR ya recibe el host/puerto exactos a usar.

### 3. Confirmar — `POST /auth/pairing/confirm`

Público (`@Public()`) — lo llama el dispositivo nuevo, que por definición todavía no tiene ninguna
credential.

```json
{
  "pairingId": "53ffa658-8ead-439c-ad17-c886e4feb750",
  "token": "He6JDFgVjxHZcMCst4125NyqjlhInBot-aGm3hzg9iY",
  "verificationCode": "385273",
  "deviceName": "Juan Android",
  "deviceType": "mobile"
}
```

`deviceName`/`deviceType` son opcionales (con default razonable); `deviceType` admite
`desktop | mobile | tablet | web | other` — el mismo enum que `devices.type`, sin acoplar el
backend a ningún cliente específico (no solo Android).

El backend valida, en orden — cualquier fallo devuelve el mismo `401 Unauthorized` genérico:

1. ¿Existe una sesión con ese `pairingId`?
2. ¿Sigue en estado `PENDING` (no `CONFIRMED`, `CANCELLED`, ni `EXPIRED`)?
3. ¿No expiró (`expiresAt`)?
4. ¿El `token` recibido coincide (por hash) con el de la sesión?
5. ¿El `verificationCode` recibido coincide (por hash) con el de la sesión?

Si todo es válido:

6. Crea un `Device` nuevo (reutilizando `DevicesService.register()` — el mismo mecanismo que usa
   `/auth/bootstrap`, no un sistema paralelo).
7. Genera su credential permanente (`CredentialService` — misma infraestructura del Milestone 5).
8. Persiste únicamente el hash de esa credential (`devices.credential_hash`), nunca en texto plano.
9. Marca la sesión de pairing como `CONFIRMED` (queda `deviceId` asociado, para auditoría/logs).
10. Devuelve la credential — **única vez que se revela**, igual que en el bootstrap.

Respuesta (`201`):

```json
{
  "device": { "id": "1a035c31-...", "name": "Juan Android", "type": "mobile" },
  "credential": "sn_cBTCGcV-0GtTcUys8ifqlsVy39hhe0gIMSSQR95eqNI"
}
```

Esa credential funciona de inmediato con `ApiAccessGuard`, exactamente igual que la de cualquier
otro dispositivo (bootstrap o pairing) — no hay una segunda clase de credentials.

### 4. Cancelar — `POST /auth/pairing/cancel` (opcional)

Protegido, `{ "pairingId": "..." }`. Pensado para que la UI del desktop pueda cerrar un diálogo de
pairing abierto antes de que expire por su cuenta. Solo funciona sobre una sesión `PENDING`.

## Estados

```
PENDING ──confirm exitoso──► CONFIRMED   (terminal)
PENDING ──expira──────────► EXPIRED      (terminal)
PENDING ──cancel───────────► CANCELLED   (terminal)
```

Una vez fuera de `PENDING`, una sesión no puede volver a usarse ni cambiar de estado — replay
protection real, no solo por convención.

## Duración y expiración

`PAIRING_EXPIRATION_MINUTES` (default `5`, ver `.env.example` y
`packages/validation/src/env/backend-env.schema.ts` — mismo sistema de configuración Zod que el
resto del backend, no uno paralelo). Un intento de confirmar una sesión expirada devuelve el mismo
`401` genérico que un token o código inválido — no se distingue externamente "expiró" de "nunca
existió" ni de "el código está mal", exactamente el mismo principio anti-enumeración que ya aplica
`ApiAccessGuard` (ver `API_ACCESS.md`).

## Generación de secretos

Todo generado con `node:crypto`, nunca con `Math.random()`:

- **Pairing token**: `randomBytes(32)` en `base64url` — mismo nivel de entropía que una device
  credential, aunque es un secreto de un solo uso con vida mucho más corta.
- **Verification code**: `randomInt(100000, 1000000)` — 6 dígitos (`100000`–`999999`), uniforme y
  sin sesgo de módulo (a diferencia de `Math.random() % 1000000`, que si se usara, sesgaría
  ligeramente los primeros valores). Pensado para comunicarse de palabra o escribirse a mano, no
  para máxima entropía — el pairing token (dentro del QR) es el factor de alta entropía; el código
  es el segundo factor "de presencia humana".

## Persistencia

Tabla `pairing_sessions` (Drizzle/SQLite, migración `0004_futuristic_kree.sql`; `device_id` recibió
su FK real hacia `devices.id` en la migración `0005_crazy_carnage.sql` del Milestone 7 — ver
[`DEVICE_MANAGEMENT.md`](./DEVICE_MANAGEMENT.md) §`pairing_sessions.device_id`):

| Campo                     | Descripción                                                        |
| -------------------------- | ------------------------------------------------------------------- |
| `id`                       | UUID — es el `pairingId`.                                            |
| `token_hash`               | SHA-256 del pairing token. **Nunca se guarda en texto plano.**       |
| `verification_code_hash`   | SHA-256 del verification code. Tampoco en texto plano.               |
| `status`                   | `pending` \| `confirmed` \| `expired` \| `cancelled`.                |
| `device_id`                | `Device` creado al confirmar (`null` hasta entonces). FK hacia `devices.id` — para auditoría/logs, y ahora también con integridad referencial real. |
| `expires_at`               | Cuándo deja de ser válida.                                            |
| `created_at`                | Cuándo se creó.                                                       |
| `confirmed_at`              | Cuándo se confirmó (`null` si no se confirmó).                       |

El hash reutiliza `CredentialService.hash()` (SHA-256) — mismo mecanismo que
`devices.credential_hash`, no una segunda implementación de hashing.

Persistir en SQLite (en vez de solo memoria) significa que un restart del backend durante una
sesión de pairing abierta no la pierde silenciosamente — sigue siendo consultable/expirable de
forma consistente. `PairingRepository` es el único punto de acceso a esta tabla.

## Cleanup

Sin scheduler — cleanup oportunista (`PairingRepository.expireStale()`), llamado al crear un
pairing nuevo y al intentar confirmar uno: marca como `expired` toda sesión `pending` cuyo
`expiresAt` ya pasó. Así una sesión vencida nunca queda con apariencia de "pending" indefinidamente,
sin necesitar un job en background.

## Logging

Reutiliza `AppLogger`/`RequestContext` — mismo sistema del Milestone 4, sin duplicar nada. Eventos:

| Evento                          | Nivel | Cuándo                                                  |
| --------------------------------- | ----- | ---------------------------------------------------------- |
| `pairing.created`                 | INFO  | `POST /auth/pairing` exitoso.                                |
| `pairing.confirmation.started`    | INFO  | Se recibió un intento de `POST /auth/pairing/confirm`.       |
| `pairing.confirmed`               | INFO  | Confirmación exitosa — sesión pasó a `CONFIRMED`.            |
| `pairing.failed`                  | WARN  | Token/código inválido, sesión no encontrada, expirada, ya confirmada, o cancelada. `metadata.reason` tiene el detalle interno. |
| `pairing.cancelled`               | INFO  | `POST /auth/pairing/cancel` exitoso.                          |
| `device.created`                  | INFO  | Se creó un `Device` (bootstrap o pairing — evento compartido, ver `API_ACCESS.md`). |

**Nunca se registra**: el pairing token, el verification code, la credential resultante, ni el
header `Authorization`. Los logs pueden contener `pairingId`, `deviceId`, `deviceType` y
`requestId` — nunca los secretos en sí. Cubierto por tests
(`apps/backend/src/auth/pairing/pairing.e2e.spec.ts`).

Una operación de pairing completa es rastreable de punta a punta por `requestId`
(`X-Request-Id`, mismo sistema del Milestone 4 — no uno nuevo):

```
requestId (creación)
    ↓
pairing.created
```
```
requestId (confirmación)
    ↓
pairing.confirmation.started
    ↓
device.created
    ↓
pairing.confirmed
```

## Errores HTTP

Mismo `GlobalExceptionFilter` existente — sin sistema paralelo. Todo rechazo de pairing es un
`401 Unauthorized` genérico (`{ statusCode, message: "Unauthorized", requestId }`), sin distinguir
externamente el motivo, sin stack trace, sin revelar si un `pairingId` existe o no.

## UI / generación de QR

Este milestone entrega el backend (`PairingService.createPairing()` → `PairingPayload`
estructurado y seguro) pero **no** una librería de generación de QR en Electron/React todavía. La
interfaz queda clara para cuando se implemente:

```
PairingService.createPairing()
        ↓
PairingPayload (JSON)
        ↓
Electron UI (serializa el JSON y lo renderiza como QR)
        ↓
QR en pantalla + verificationCode mostrado aparte
```

La lógica de renderizado de QR es responsabilidad de la UI, no del dominio de seguridad — el
backend nunca necesita saber que su respuesta terminará como una imagen QR.

## Relación con el Milestone 5 (bootstrap)

El pairing es un mecanismo de provisioning **adicional**, no un reemplazo de `/auth/bootstrap`.
Ambos:

- Reutilizan la misma infraestructura de credentials (`CredentialService`, `DevicesService`,
  `ApiAccessGuard`) — la credential emitida es indistinguible sin importar cómo se obtuvo.
- Siguen el mismo patrón: un secreto temporal y de un solo uso que se canjea, una única vez, por
  una credential permanente que nunca vuelve a mostrarse.
- Emiten `device.created` al crear el `Device`.

`/auth/bootstrap` sigue siendo necesario para la instalación inicial de Electron (cuando **no**
existe ningún dispositivo activo todavía, el pairing no aplica — no hay ningún dispositivo
autenticado que pueda iniciarlo). El pairing asume que ya existe al menos uno.

**Relación con el Milestone 7 (Device Management)**: el dispositivo creado por bootstrap es el
único que nace administrador (`is_admin: true`); todo dispositivo creado por pairing nace como
dispositivo cliente (`is_admin: false`), sin poder administrar otros dispositivos — ver
[`DEVICE_MANAGEMENT.md`](./DEVICE_MANAGEMENT.md) §Quién puede administrar dispositivos.

## Compatibilidad futura

El diseño no es exclusivo de Electron ni de Android: cualquier cliente que pueda escanear un QR
(o recibir su payload por otro medio) y enviar un `POST /auth/pairing/confirm` con HTTP+JSON puede
emparejarse — desktop, mobile, tablet, laptop, todos son simplemente un `Device` con
`deviceId`/`credential`/`deviceType`/`deviceName`, autenticado siempre de la misma forma
(`Authorization: Bearer <credential>`).

## Fuera de alcance de este milestone

No implementado (y no debería inferirse de este documento): cliente Android/iOS real, generación
de QR en Electron/React, descubrimiento automático de red (mDNS/similar), WebSocket, UI de
administración de dispositivos (la API sí existe desde el Milestone 7, ver
[`DEVICE_MANAGEMENT.md`](./DEVICE_MANAGEMENT.md)), roles/permisos, multiusuario. Ver
`API_ACCESS.md` §Limitaciones para las limitaciones del modelo de seguridad local, que aplican
igual acá — el pairing no promete más aislamiento que el resto de la API.

## UI / Electron Integration Tests — Pending

> **Actualización M14:** la UI de pairing del Desktop **ya existe**
> (`apps/desktop/renderer/src/features/devices/components/PairingDialog.tsx`) y el Web Client
> (`apps/web-client`) ya puede confirmar un pairing real — ver
> [`docs/lan/DEVICE_MANAGEMENT.md`](../lan/DEVICE_MANAGEMENT.md). Esto resuelve, en la práctica,
> buena parte de lo que este checklist marcaba `TODO` por falta de UI/de un segundo cliente real
> (secciones 1–3 y 5 más abajo, principalmente). Lo que sigue sin existir y sigue siendo `TODO`
> genuino: un cliente QR con cámara real (el Web Client pega el JSON en vez de escanear), un
> cliente Android/iOS real (Mobile es M15), y el almacenamiento seguro de una credential de
> *pairing* en un segundo Electron/Desktop (`DeviceCredentialStore` hoy solo cubre la credential de
> *bootstrap* — ver la nota en §2 más abajo, que sigue vigente). Este checklist no se reescribió
> punto por punto; se deja como referencia histórica del estado pre-M14 más esta nota.

**Estas pruebas no son un faltante del backend ni representan bugs conocidos.** Todo lo descrito
en este documento hasta acá (generación de token/código, expiración, single-use, creación de
`Device`, emisión de credential, logging, `ApiAccessGuard`) está implementado y probado —
`pairing.service.spec.ts` (unit) y `pairing.e2e.spec.ts` (HTTP real, incluida la verificación de
ausencia de secretos en `app.log`) cubren el backend de punta a punta contra un servidor real
compilado (ver el resumen de verificación manual de Milestone 6 en el historial del proyecto).

Lo que falta es la **UI de React/Electron que consume esta API** — no existe todavía (ver
§Fuera de alcance más arriba). Esta sección es el checklist a ejecutar cuando esa UI se
implemente, para validar la integración real UI + Electron + backend. Hasta entonces, todos los
puntos quedan marcados `TODO`.

### 1. Pruebas del QR real

| # | Prueba | Estado | Notas |
| - | ------ | ------ | ----- |
| 1 | El backend genera correctamente el payload del QR | ✅ Ya verificado | Cubierto por `pairing.e2e.spec.ts` y por §QR payload/§Host de red más arriba — no requiere UI. |
| 2 | La UI transforma el payload en una imagen QR real | `TODO` | No hay librería de QR elegida ni agregada todavía (ver §UI/generación de QR). |
| 3 | El QR puede escanearse desde otro dispositivo | `TODO` | Requiere un dispositivo físico con cámara y un lector capaz de extraer el JSON — el "otro dispositivo" no existe en este repo (no hay cliente Android/iOS, ver §Fuera de alcance); en la práctica, hasta que exista un cliente real, esta prueba se simula enviando el payload decodificado directamente a `POST /auth/pairing/confirm` (que es exactamente lo que ya hacen los tests de backend). |
| 4 | El dispositivo cliente obtiene correctamente `host` | `TODO` | El backend ya lo resuelve (`resolveLanHost()`, §Host/red) — falta verificar que la UI que decodifica el QR lo lea del campo correcto (`qr.host`) y lo use para armar la URL base de sus propias requests. |
| 5 | El dispositivo cliente obtiene correctamente `port` | `TODO` | Campo `qr.port`, mismo razonamiento. |
| 6 | El dispositivo cliente obtiene la información temporal necesaria (`expiresAt`) | `TODO` | Campo `qr.expiresAt` — usado por la UI del dispositivo nuevo para saber si vale la pena intentar confirmar antes de golpear el backend. |
| 7 | El dispositivo cliente obtiene la versión/formato del payload (`version`) | `TODO` | Hoy siempre `1` — la UI debería, como mínimo, no asumir campos de una versión futura sin chequear `version` primero. |
| 8 | El QR no contiene una credential permanente | ✅ Ya garantizado | Estructuralmente cierto — `PairingQrPayload` no tiene ningún campo de credential (ver §Principio de seguridad). Igual, una vez exista la UI, vale decodificar el QR *real* generado (no solo el JSON del backend) y confirmar que la librería de QR no agregó nada extra al payload serializado. |
| 9 | El QR no contiene `credentialHash` | ✅ Ya garantizado | Mismo razonamiento que el punto anterior. |
| 10 | El QR no contiene secretos del dispositivo ni información sensible innecesaria | ✅ Ya garantizado | El payload es exactamente `{ version, type, host, port, protocol, pairingId, token, expiresAt }` — nada más. Repetir la verificación sobre el QR renderizado, no solo sobre la respuesta JSON. |

**Casos con QR en distintos estados** — el comportamiento del *backend* para cada uno ya está
probado (`pairing.e2e.spec.ts`); lo pendiente es exclusivamente cómo la UI reacciona a la
respuesta que el backend ya devuelve hoy:

| Caso | Respuesta del backend (ya implementada) | Pendiente en UI |
| ---- | ---------------------------------------- | ---------------- |
| QR válido, dentro de la ventana | `201` + `{ device, credential }` | `TODO`: transición a estado confirmado, guardado de la credential (ver §2). |
| QR expirado | `401` genérico (mismo body que cualquier otro rechazo — ver §Duración y expiración) | `TODO`: mostrar "el código expiró", ofrecer generar uno nuevo. |
| QR de un pairing ya `CONFIRMED` | `401` genérico (single-use, ver §Estados) | `TODO`: mostrar "este QR ya fue usado", sin crear un segundo device. |
| QR de un pairing `CANCELLED` | `401` genérico | `TODO`: mostrar "este pairing fue cancelado desde el desktop". |
| Reutilización del mismo QR tras confirmarlo una vez | `401` genérico (idéntico al caso "ya `CONFIRMED`") | `TODO`: mismo tratamiento — la UI no necesita (ni puede) distinguir este caso del anterior, porque el backend tampoco lo distingue (anti-enumeración, ver §Duración y expiración). |

### 2. Pruebas de seguridad del Renderer

Checklist a ejecutar con DevTools de Electron (proceso renderer) + revisión de código, una vez
exista la UI de pairing en React. Se apoya en la arquitectura **real** ya implementada, no en un
mecanismo nuevo:

- El renderer (`apps/desktop/renderer/src/lib/api-client.ts`) es un wrapper de `fetch()` sin
  ningún manejo de `Authorization` — nunca tuvo, ni debe tener, código que lea o escriba una
  credential.
- La credential se adjunta a las requests salientes **fuera del renderer**, en el proceso
  Electron Main, vía `session.defaultSession.webRequest.onBeforeSendHeaders`
  (`apps/desktop/electron/main/index.ts`, función `attachDeviceCredential`) — a nivel de red, no
  de código de aplicación.
- La credential persiste cifrada con `safeStorage` en `userData/device-credential.enc`
  (`DeviceCredentialStore`, `apps/desktop/electron/main/device-credential-store.ts`) — un archivo
  que el proceso renderer no tiene forma de leer (no hay IPC que lo exponga; `preload/index.ts`
  solo expone `backendBaseUrl` y `versions` vía `contextBridge`, ver `types/global.d.ts`).

Checklist — verificar, con la UI de pairing ya implementada, que la credential permanente
**nunca** aparece en:

- [ ] `localStorage`
- [ ] `sessionStorage`
- [ ] IndexedDB
- [ ] cookies accesibles desde el renderer
- [ ] URLs (path)
- [ ] query parameters
- [ ] hash de la URL
- [ ] estado global de React (Context, `useState` compartido, etc.)
- [ ] cualquier store persistente (Zustand — `apps/desktop/renderer/src/stores/ui-store.ts` es el
      único hoy, y no debería crecer para incluir esto — o Redux si se agregara en el futuro)
- [ ] archivos accesibles por el renderer
- [ ] logs del renderer (consola de DevTools)
- [ ] mensajes de debug
- [ ] errores mostrados al usuario
- [ ] props de componentes React
- [ ] el HTML generado (inspeccionar el DOM renderizado)
- [ ] atributos `data-*`
- [ ] el clipboard
- [ ] el QR generado por la UI (el QR debe llevar el *pairing token*, nunca una credential — ver
      §Principio de seguridad; esto aplica al QR que la UI genera para emparejar a OTRO
      dispositivo, no a la credential del propio Electron)

También verificar:

- [ ] La credential no se imprime mediante `console.log` (ni accidentalmente vía
      `console.log(response)` de algún debug temporal).
- [ ] La credential no aparece en el mensaje de un error no controlado (revisar qué le llega a
      `parseErrorMessage()` en `api-client.ts` cuando una request falla).
- [ ] La credential no se incluye en analytics/telemetry — hoy no existe ningún sistema de
      analytics en el proyecto; si se agrega en el futuro, repetir esta verificación.
- [ ] La credential no se persiste desde código React (ni con `localStorage.setItem`, ni
      guardando la respuesta de `/auth/pairing/confirm` en ningún store).
- [ ] La credential no se pasa innecesariamente entre Renderer y Main — hoy no hay ningún canal
      IPC para esto (`ipcMain`/`ipcRenderer`) y no debería agregarse uno solo para mover la
      credential; Main ya la obtiene directamente por HTTP (ver `bootstrap-device.ts` como
      precedente) sin pasar por el renderer.
- [ ] Electron Main sigue siendo el único responsable de administrar la credential (obtenerla,
      cifrarla, adjuntarla a las requests) — el renderer solo dispara acciones de UI
      (ej. "Generar pairing", "Cancelar"), nunca maneja el secreto resultante.
- [ ] El renderer usa `api-client.ts` (o su evolución) para hacer requests sin conocer la
      credential — igual que ya hace hoy para `/products`, `/health`, etc.

**Si la implementación usa `safeStorage`** (ya es el caso para la credential de bootstrap, y
debería serlo también para una credential obtenida por pairing en un segundo Electron/desktop),
verificar:

- [ ] La credential persistente sigue almacenada de forma segura (cifrada, no en texto plano en
      disco) — mismo mecanismo que `DeviceCredentialStore` ya usa.
- [ ] El renderer no tiene acceso directo al archivo cifrado ni a `safeStorage` (no está expuesto
      vía `contextBridge`, y no debería estarlo).
- [ ] Reiniciar la aplicación **no** requiere volver a hacer pairing si el dispositivo sigue
      activo — hoy esto ya funciona para el dispositivo de **bootstrap**
      (`ensureDeviceCredential()` intenta cargar la credential guardada antes de intentar
      bootstrapear de nuevo). **Pendiente real**: no existe todavía el equivalente para un
      dispositivo **emparejado por QR** (por ejemplo, una segunda instalación de Electron
      emparejada como "Notebook") — ese flujo (guardar la credential de pairing con
      `DeviceCredentialStore`, y cargarla al reiniciar en vez de tener que re-escanear un QR) es
      parte de lo que la UI/Electron de pairing todavía tiene que construir, no algo que ya exista
      y haya que solo verificar.

### 3. Pruebas completas de UX del Pairing

Los cuatro estados son los que ya devuelve el backend en el campo `status`
(`PairingStatus = "pending" | "confirmed" | "expired" | "cancelled"`, minúsculas — ver
`packages/api-contracts/src/auth/auth.contract.ts`).

**Estado `pending`** — la UI debería mostrar:

- [ ] El QR.
- [ ] El código de verificación (`verificationCode`, ver §Crear un pairing).
- [ ] El tiempo restante (calculable en el cliente a partir de `expiresAt`, sin necesidad de
      pollear al backend — ver nota sobre expiración en tiempo real más abajo).
- [ ] Un estado visual de "esperando confirmación".
- [ ] Una opción para cancelar (`POST /auth/pairing/cancel`, ya implementado).

**Transición a `confirmed`** — verificar:

- [ ] La UI detecta la confirmación (hoy no hay push/WebSocket — ver §Fuera de alcance — así que
      esto requiere que la UI *pollee* algún endpoint, o que el propio dispositivo nuevo notifique
      de otra forma; **este mecanismo de detección todavía no está diseñado** y es una decisión de
      UI pendiente, no algo que el backend deba resolver).
- [ ] Se recibe la nueva credential — pero solo en el dispositivo que confirmó
      (`POST /auth/pairing/confirm`), **nunca** en el desktop que generó el QR: el desktop no
      vuelve a ver esa credential en ningún momento (ver §Confirmar).
- [ ] Esa credential se almacena de forma segura mediante Electron Main (§2) — aplica solo si el
      dispositivo que confirma es, a su vez, una instalación de Electron.
- [ ] El dispositivo nuevo puede hacer una request autenticada inmediatamente después.

**Estado `expired`** — verificar:

- [ ] El countdown de la UI llega a cero en el momento correcto (coincide con `expiresAt`).
- [ ] La UI informa que el pairing expiró.
- [ ] El QR deja de considerarse válido — esto ya es cierto en el backend independientemente de
      si alguien "marcó" la sesión como expirada: `PairingService.confirmPairing()` compara
      `expiresAt` contra la hora actual en cada intento, así que un intento de confirmación después
      de `expiresAt` es rechazado aunque el cleanup oportunista (`expireStale()`, ver §Cleanup)
      todavía no haya corrido — la UI puede confiar en su propio countdown sin necesitar preguntarle
      al backend si "ya expiró".
- [ ] El pairing no puede reutilizarse (ya cubierto server-side).

**Estado `cancelled`** — verificar:

- [ ] El usuario cancela desde la UI del desktop.
- [ ] El backend recibe la cancelación (`POST /auth/pairing/cancel`, ya implementado).
- [ ] La UI refleja correctamente el nuevo estado (deja de mostrar el QR como válido).
- [ ] El pairing no puede confirmarse después (ya cubierto server-side).

### 4. Casos de error de UX

Para cada caso, el comportamiento del backend ya está implementado y probado; lo que sigue
pendiente es exclusivamente la reacción de la UI.

| Caso | Backend (ya implementado) | Pendiente en UI |
| ---- | --------------------------- | ---------------- |
| Código de verificación incorrecto | `401` genérico, la sesión **sigue `pending`** (no se consume en un intento fallido — ver §Confirmar) | `TODO`: mostrar un error comprensible, sin revelar que específicamente el código estaba mal (el backend tampoco lo revela); permitir reintentar **con el mismo QR**, ya que la sesión no se invalidó. |
| Token/QR inválido | `401` genérico | `TODO`: error claro; no almacenar ninguna credential (no la hay); no dejar la UI en un estado a mitad de camino (ej. mostrando "conectando..." indefinidamente). |
| Pairing expirado | `401` genérico (ver §3 sobre el chequeo de `expiresAt` en tiempo real) | `TODO`: informar la expiración; ofrecer iniciar un nuevo pairing (`POST /auth/pairing` de nuevo). |
| Pairing ya utilizado | `401` genérico, idéntico al resto de los rechazos (anti-enumeración) | `TODO`: mostrar un error apropiado; **no** crear otro `Device` (imposible de todos modos: el backend ya lo impide) ni obtener una segunda credential. |
| Pairing cancelado | `401` genérico | `TODO`: impedir la confirmación (ya impedido server-side); permitir iniciar uno nuevo. |
| Backend inaccesible | No aplica — es un problema de conectividad del cliente, no del backend. Las sesiones de pairing expiran por su propio TTL sin importar si el cliente sigue conectado (no hay un estado "esperando al cliente" del lado del servidor). | `TODO`: timeout/error controlado en el cliente; mensaje comprensible; como el backend nunca deja la sesión en un limbo, la UI tampoco debería — simplemente permitir reintentar la request o cancelar. |
| Credential revocada | `401` en cualquier request posterior a `POST /auth/devices/:id/revoke` (ver `DEVICE_MANAGEMENT.md` §Revocación permanente) — **no existe** ningún mecanismo de reactivación en el backend | `TODO`: la UI debe manejar el `401` sin intentar "reactivar" nada (no hay endpoint para eso — ver `DEVICE_MANAGEMENT.md` §Revocación permanente), y guiar al usuario a hacer un nuevo pairing. |

### 5. Prueba de ciclo completo (end-to-end)

Checklist de integración completa. Los pasos marcados ✅ ya están cubiertos por tests de backend
reales (`auth.e2e.spec.ts`, `pairing.e2e.spec.ts`, `devices.e2e.spec.ts`) y por la verificación
manual contra el backend compilado documentada en los Milestones 5–7; los marcados `TODO` dependen
de que exista la UI/un segundo cliente real.

| # | Paso | Estado |
| - | ---- | ------ |
| 1 | Desktop inicia backend | ✅ (`BackendManager`, ya funciona hoy) |
| 2 | Desktop genera pairing | ✅ (`POST /auth/pairing`, backend) |
| 3 | UI muestra QR | `TODO` |
| 4 | Otro dispositivo escanea QR | `TODO` (requiere dispositivo/cliente real) |
| 5 | Usuario introduce/confirma código | `TODO` (UI del dispositivo nuevo) |
| 6 | Backend valida token + código | ✅ (`PairingService.confirmPairing()`) |
| 7 | Backend crea `Device` | ✅ (`DevicesService.register()`) |
| 8 | Backend devuelve credencial una sola vez | ✅ (`PairingConfirmResult`) |
| 9 | Cliente almacena la credencial mediante el mecanismo seguro correspondiente | `TODO` (ver §2 — falta el equivalente de `DeviceCredentialStore` para un dispositivo emparejado, no solo para el de bootstrap) |
| 10 | Cliente realiza una request autenticada | ✅ a nivel backend (la credential ya funciona con `ApiAccessGuard`) / `TODO` a nivel UI real |
| 11 | Backend acepta la credencial | ✅ |
| 12 | Reiniciar cliente | `TODO` (depende del punto 9) |
| 13 | Verificar que continúa autenticado | `TODO` (depende del punto 9) |
| 14 | Desde Device Management, revocar el dispositivo | ✅ (`POST /auth/devices/:id/revoke`, backend — sin UI todavía) |
| 15 | Cliente realiza una nueva request | ✅ a nivel backend / `TODO` a nivel UI real |
| 16 | Backend devuelve `401` | ✅ |
| 17 | Cliente no intenta reactivar la credencial | ✅ estructuralmente (no existe el endpoint) / `TODO` verificar que la UI tampoco lo intente por su cuenta |
| 18 | Usuario realiza un nuevo pairing | ✅ backend / `TODO` UI |
| 19 | Se crea un nuevo dispositivo/credencial | ✅ (verificado en `devices.e2e.spec.ts`, "flujo crítico de seguridad") |
| 20 | El nuevo dispositivo vuelve a funcionar | ✅ backend / `TODO` UI real |

### 6. Verificación de logs durante las pruebas

Mismo mecanismo del Milestone 4 (`AppLogger`/`LogReader`) — nada nuevo que agregar. Al ejecutar el
flujo de UI, el `app.log` puede (y debería) contener:

- `device.created`, `pairing.created`, `pairing.confirmation.started`, `pairing.confirmed`,
  `pairing.failed`, `pairing.cancelled` (ver §Logging más arriba).
- `device.access.denied` (ver `DEVICE_MANAGEMENT.md` §Auditoría/Logging) si la UI ejecuta alguna
  operación de Device Management durante la prueba.
- Logs de request HTTP estándar (`http.request.started/completed/failed`, ver
  `docs/logging/LOGGING.md`).
- El `requestId` de cada operación (`X-Request-Id`).

Y **nunca** debería contener:

- La credential (en texto plano o hasheada).
- `credentialHash`.
- El header `Authorization`.
- El pairing token.
- El verification code.
- Cualquier secreto equivalente.

La prueba debe incluir, al final del flujo de UI, una búsqueda en `app.log` (por ejemplo con
`LogReader` o `grep`, igual que ya hace `pairing.e2e.spec.ts` y `devices.e2e.spec.ts` a nivel
backend) que confirme la ausencia de todos los valores anteriores — usando los valores reales
generados durante esa sesión de prueba (el pairing token, el código, y la credential obtenida),
no solo buscando las palabras genéricas.

### 7. Criterio de aceptación

- [ ] QR real generado correctamente.
- [ ] QR escaneable desde otro dispositivo.
- [ ] QR no contiene credencial permanente.
- [ ] Expiración del pairing funciona desde la UI.
- [ ] Countdown funciona correctamente.
- [ ] Cancelación funciona.
- [ ] Código incorrecto manejado correctamente (con posibilidad de reintentar sobre el mismo QR).
- [ ] Token/QR expirado manejado correctamente.
- [ ] Pairing reutilizado rechazado.
- [ ] Credencial nunca aparece en el Renderer.
- [ ] Credencial no aparece en `localStorage`/`sessionStorage`/IndexedDB.
- [ ] Credencial no aparece en logs del Renderer.
- [ ] Credencial solo es administrada por Electron Main.
- [ ] Credencial sobrevive correctamente a un reinicio (dispositivo de bootstrap: ya funciona;
      dispositivo emparejado: pendiente de construir el mecanismo, ver §2 y §5 punto 9).
- [ ] Revocación produce `401` (ya cierto hoy a nivel backend).
- [ ] No existe mecanismo de reactivación (ya cierto hoy — verificar que la UI tampoco lo sugiera).
- [ ] Nuevo pairing genera una credencial nueva e independiente (ya verificado a nivel backend).
- [ ] Logs no contienen secretos.
- [ ] Flujo completo Desktop → Pairing → Client → Auth → Revocation → Re-pairing funciona de
      punta a punta con una UI real.
