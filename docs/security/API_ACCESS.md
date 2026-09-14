# Control de acceso a la API

StockNegozia establece una frontera de autenticación entre los clientes (Electron, y en el futuro
otros dispositivos emparejados) y la API HTTP del backend. El objetivo es que la API no pueda
usarse simplemente conociendo `http://localhost:<port>` — un cliente debe presentar una credential
válida asociada a una identidad de dispositivo.

## Objetivo

- En **desarrollo**, seguir pudiendo golpear el backend desde el navegador, Postman o el dev
  server de React sin autenticar manualmente cada request.
- En **producción**, exigir una credential criptográficamente segura por dispositivo. Un cliente
  sin credential válida recibe `401 Unauthorized`, sin detalles internos sobre el motivo.
- No confiar nunca en que una request viene de Electron por `User-Agent`, `Origin`, IP localhost o
  cualquier header — todo eso puede falsificarse. La única frontera real es la credential.

## Arquitectura

```
Browser / Electron
        │
        │ Authorization: Bearer <credential>  (solo en production)
        ▼
  ApiAccessGuard            (APP_GUARD global — apps/backend/src/auth/guards/api-access.guard.ts)
        │
   ┌────┴────┐
   │         │
@Public()   resto de endpoints
   │         │
   ▼         ▼
 pasa     valida credential → Device (SQLite) → activo/revocado
              │
              ▼
          NestJS Controller → Service → Repository → SQLite
```

El guard se registra una sola vez (`APP_GUARD` en `AuthModule`) y protege **todos** los
controllers por defecto — ningún controller de negocio necesita lógica de autenticación propia.

## `API_ACCESS_MODE`

Variable de entorno validada con Zod (`packages/validation/src/env/backend-env.schema.ts`), junto
al resto de la configuración del backend — no es un sistema paralelo.

| Valor         | Comportamiento                                                                 |
| ------------- | ------------------------------------------------------------------------------- |
| `development` | (default) Todo endpoint responde sin credential. Para poder seguir developeando desde el navegador, Postman, etc. |
| `production`  | Todo endpoint no marcado `@Public()` exige `Authorization: Bearer <credential>` de un dispositivo activo. |

No existe un bypass implícito basado en `NODE_ENV` — el modo de acceso es una decisión explícita e
independiente.

## Identidad de dispositivo

Tabla `devices` (Drizzle/SQLite, migración `0003_colossal_marvel_apes.sql`):

| Campo             | Descripción                                                        |
| ----------------- | ------------------------------------------------------------------- |
| `id`               | UUID, identidad estable del dispositivo.                            |
| `name`             | Nombre descriptivo (ej. "Electron Desktop").                        |
| `type`             | `desktop` \| `mobile` \| `web`.                                     |
| `status`           | `active` \| `revoked`.                                              |
| `credential_hash`  | SHA-256 de la credential — **nunca se guarda la credential en texto plano**. |
| `created_at`       | Fecha de alta.                                                       |
| `last_seen_at`     | Última vez que la credential autenticó una request (throttled, ver más abajo). |

`deviceId` y la credential son conceptos separados: el primero identifica al dispositivo (puede
aparecer en logs), la segunda es el secreto que lo autentica (nunca aparece en logs ni se
persiste en texto plano).

## Credential

- Generada con `node:crypto` (`randomBytes(32)`, codificada `base64url`) — criptográficamente
  segura e impredecible. Ver `CredentialService` (`apps/backend/src/auth/credential/`).
- Solo existe en texto plano en memoria durante su generación y en el body de la respuesta única
  de `POST /auth/bootstrap`. Lo único persistido es su hash SHA-256.
- Revocable: marcar el `Device` como `revoked` invalida su credential de inmediato.

## Autenticación HTTP

Mecanismo estándar `Authorization: Bearer <credential>` — sin protocolo criptográfico propio. El
guard (`ApiAccessGuard`) resuelve, en orden:

1. ¿El endpoint está marcado `@Public()`? → pasa.
2. ¿`API_ACCESS_MODE=development`? → pasa (evento `auth.request.allowed`).
3. ¿Hay header `Authorization: Bearer <token>`? Si no → `401` (`auth.request.denied`,
   `reason: missing_credential`).
4. ¿El token corresponde a algún `Device`? Si no → `401` (`auth.device.rejected`,
   `reason: invalid_credential`).
5. ¿Ese `Device` está `active`? Si no → `401` (`auth.device.rejected`,
   `reason: device_revoked`).
6. Autenticado → continúa, actualiza `last_seen_at` (throttled) y loguea
   `auth.device.authenticated`.

La respuesta HTTP en cualquiera de los casos de rechazo (3–5) es siempre el mismo `401` genérico —
**no se diferencia externamente** entre credential ausente, inválida, o dispositivo revocado. El
motivo real solo queda en el log interno (`metadata.reason`), nunca en el body de la respuesta.

## Endpoints públicos

Marcados con el decorator `@Public()` (`apps/backend/src/auth/decorators/public.decorator.ts`):

- `GET /health` — Electron hace polling antes de tener ninguna credential.
- `POST /auth/bootstrap` — por definición, el cliente todavía no tiene credential; su seguridad
  viene del token de instalación de un solo uso, no de este guard.

Todo endpoint de negocio (Products, Categories, Sales, etc.) queda protegido por defecto — no se
marcó ninguno como público sin una razón explícita.

## Endpoints protegidos

El resto de la API (`/products`, `/categories`, `/sales`, ...) — sin cambios en su lógica de
negocio; siguen funcionando exactamente igual, ahora detrás del guard.

## Bootstrap del primer dispositivo

Ver `apps/backend/src/auth/bootstrap/bootstrap-token.service.ts`.

```
Backend arranca
      │
      ▼
¿Existe algún Device activo?
      │
   No │                                Sí
      ▼                                 ▼
Genera un token de instalación   No emite/borra el token —
de un solo uso (32 bytes         el bootstrap ya no está disponible
random, TTL 10 min) y lo         (el siguiente dispositivo se agrega
escribe en                       vía pairing QR — no implementado aún)
<dataDir>/config/bootstrap.token
      │
      ▼
Electron main (mismo dataDir, se lo inyecta él mismo al backend
vía STOCKNEGOZIA_DATA_DIR) lee el archivo y hace
POST /auth/bootstrap { token, name, type }
      │
      ▼
Token válido y no expirado → crea el Device, devuelve
{ deviceId, credential } (única vez que se ve en texto plano),
borra el token (de un solo uso)
      │
      ▼
Electron cifra la credential con `safeStorage` y la guarda en
userData/device-credential.enc
```

**Por qué no hace falta un secreto global**: el token de bootstrap no es una contraseña compartida
entre instalaciones — se genera de nuevo en cada instalación/arranque sin dispositivos, es de un
solo uso, expira a los 10 minutos, y su "canal de entrega" es el propio sistema de archivos local
que Electron y el backend ya comparten (`STOCKNEGOZIA_DATA_DIR`) — no viaja por red ni se
hardcodea en ningún lado.

## Almacenamiento de la credential en Electron

`apps/desktop/electron/main/device-credential-store.ts` — cifrada con `safeStorage` (Electron:
DPAPI en Windows, Keychain en macOS, libsecret en Linux). No se agregó ninguna dependencia nueva.

La credential **nunca llega al proceso renderer**: no está en `localStorage`, no está en código
React, no pasa por `contextBridge`. Se adjunta a las requests salientes hacia el backend a nivel de
sesión de Electron (`session.defaultSession.webRequest.onBeforeSendHeaders`, en
`apps/desktop/electron/main/index.ts`) — el renderer sigue usando `fetch()` normal
(`apps/desktop/renderer/src/lib/api-client.ts`, sin cambios) sin saber que la credential existe.

## Revocación

`DevicesService.revoke(deviceId)` marca el dispositivo como `revoked` — su credential deja de
autenticar de inmediato. No hay todavía un endpoint HTTP ni UI de administración (fuera de alcance
de este milestone); la capacidad queda preparada a nivel de servicio para una futura pantalla de
administración de dispositivos.

## `last_seen_at`

Se actualiza como mucho una vez por minuto por dispositivo (throttle en memoria, ver
`DevicesService.touchLastSeen`) — no en cada request, para no convertir esto en un sistema de
telemetría ni generar escrituras innecesarias a SQLite.

## Logging

Reutiliza `AppLogger`/`RequestContext`/`GlobalExceptionFilter` existentes (Milestone 4) — no se
creó un segundo sistema de logging ni de request IDs. Eventos nuevos:

| Evento                     | Nivel | Cuándo                                                      |
| --------------------------- | ----- | ------------------------------------------------------------ |
| `auth.request.allowed`      | DEBUG | Request permitida en `API_ACCESS_MODE=development`.           |
| `auth.request.denied`       | WARN  | Falta el header `Authorization` en `production`.               |
| `auth.device.authenticated` | INFO  | Credential válida, dispositivo activo.                         |
| `auth.device.rejected`      | WARN  | Credential inválida o dispositivo revocado.                    |
| `auth.device.revoked`       | INFO  | Un dispositivo fue revocado.                                    |
| `auth.bootstrap.started`    | INFO  | Se recibió un intento de `POST /auth/bootstrap`.                |
| `auth.bootstrap.completed`  | INFO  | Bootstrap exitoso — se registró un nuevo `Device`.              |
| `auth.bootstrap.failed`     | WARN/ERROR | Token de bootstrap inválido/expirado, o error al persistirlo. |

**Nunca se registra**: el header `Authorization`, la credential (en texto plano o hasheada), el
token de bootstrap, ni el body completo de la request. Solo `deviceId` y un `reason` técnico (ej.
`invalid_credential`, `device_revoked`) — cubierto por tests (`auth.e2e.spec.ts`).

Toda request — autenticada o rechazada — conserva su `requestId` (`X-Request-Id`), tanto en la
respuesta como en cada entrada de `app.log`, exactamente igual que antes de este milestone.

## Futuro: pairing QR

Preparado para, más adelante, agregar `POST /auth/pairing/start` y `POST /auth/pairing/confirm`
para emparejar dispositivos adicionales (mobile, otra laptop) sin reusar el flujo de bootstrap:

```
Desktop ya emparejado
        │
        ▼
   inicia pairing
        │
        ▼
   QR + código temporal (de un solo uso, igual que el token de bootstrap)
        │
        ▼
otro dispositivo escanea, usuario confirma el código
        │
        ▼
backend verifica → crea un nuevo Device → credential propia
```

El QR/código nunca se convierte directamente en la credential permanente — cada dispositivo
emparejado obtiene la suya, generada por el backend, igual que el dispositivo bootstrap. **No
implementado en este milestone** — solo el decorator `@Public()` y el guard centralizado ya están
preparados para que agregar estas rutas más adelante no requiera rediseñar nada.

## Limitaciones del modelo de seguridad local

Este milestone impide el consumo casual/no autorizado de la API por parte de otros procesos o
dispositivos en la red. No promete seguridad absoluta:

- El backend corre en la misma máquina que Electron. Un usuario con control total del sistema
  operativo (acceso a `userData`, a la memoria del proceso, etc.) puede eventualmente extraer la
  credential — igual que podría hacerlo con cualquier secreto local de cualquier aplicación
  desktop. `safeStorage` eleva la dificultad (requiere las credenciales del propio usuario del SO
  para descifrar en la mayoría de los backends), pero no es una bóveda inviolable.
- `localhost` no es, por sí mismo, una frontera de seguridad — cualquier proceso local podría
  intentar conectarse al puerto; por eso la credential es indispensable en producción, no opcional.
- El objetivo es elevar significativamente la barrera para un uso casual o accidental de la API
  (otra app, un script, un dispositivo en la misma red intentando adivinar el puerto), no
  defenderse de un atacante con control total de la máquina.
