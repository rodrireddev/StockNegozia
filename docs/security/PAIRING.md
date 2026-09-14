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

Tabla `pairing_sessions` (Drizzle/SQLite, migración `0004_futuristic_kree.sql`):

| Campo                     | Descripción                                                        |
| -------------------------- | ------------------------------------------------------------------- |
| `id`                       | UUID — es el `pairingId`.                                            |
| `token_hash`               | SHA-256 del pairing token. **Nunca se guarda en texto plano.**       |
| `verification_code_hash`   | SHA-256 del verification code. Tampoco en texto plano.               |
| `status`                   | `pending` \| `confirmed` \| `expired` \| `cancelled`.                |
| `device_id`                | `Device` creado al confirmar (`null` hasta entonces). Solo para auditoría/logs — no es una FK que otro código dependa de resolver. |
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

## Compatibilidad futura

El diseño no es exclusivo de Electron ni de Android: cualquier cliente que pueda escanear un QR
(o recibir su payload por otro medio) y enviar un `POST /auth/pairing/confirm` con HTTP+JSON puede
emparejarse — desktop, mobile, tablet, laptop, todos son simplemente un `Device` con
`deviceId`/`credential`/`deviceType`/`deviceName`, autenticado siempre de la misma forma
(`Authorization: Bearer <credential>`).

## Fuera de alcance de este milestone

No implementado (y no debería inferirse de este documento): cliente Android/iOS real, generación
de QR en Electron/React, descubrimiento automático de red (mDNS/similar), WebSocket, pantalla de
administración de dispositivos, revocación desde UI, roles/permisos, multiusuario. Ver
`API_ACCESS.md` §Limitaciones para las limitaciones del modelo de seguridad local, que aplican
igual acá — el pairing no promete más aislamiento que el resto de la API.
