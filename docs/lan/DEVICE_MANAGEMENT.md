# Device Management LAN (M14)

Este documento cubre lo que M14 agregó **por encima** del backend de autenticación de
dispositivos, que ya existía y estaba probado desde antes (numeración interna del proyecto:
"Milestone 6" = Pairing, "Milestone 7" = Device Management). Para el diseño de seguridad, el
modelo de datos, los endpoints y el razonamiento detrás de cada decisión, leer primero:

- [`docs/security/API_ACCESS.md`](../security/API_ACCESS.md) — modelo general de autenticación
  (`Device`, `credential`, `ApiAccessGuard`, `API_ACCESS_MODE`).
- [`docs/security/PAIRING.md`](../security/PAIRING.md) — flujo de pairing (QR + código de
  verificación), incluye un checklist detallado de UI que este milestone resuelve parcialmente
  (ver la nota al principio de su sección "UI / Electron Integration Tests").
- [`docs/security/DEVICE_MANAGEMENT.md`](../security/DEVICE_MANAGEMENT.md) — API de
  administración (`/auth/devices/*`), revocación permanente, protección contra auto-revocación.
- [`docs/security/NEXT_STEPS.md`](../security/NEXT_STEPS.md) — pendientes conocidos, actualizado
  por este milestone.
- [`docs/lan/LAN_TESTING.md`](./LAN_TESTING.md) — M13, conectividad LAN sin autenticación. Este
  documento es su continuación directa.

Este documento cubre exclusivamente lo **nuevo** de M14: la UI de Desktop, el pairing real desde
el Web Client, el endpoint de estado de pairing, la política de CORS, y la prueba manual de punta
a punta con dos dispositivos.

## LAN connectivity vs. Device authorization

Son dos capas distintas, fáciles de confundir:

- **LAN connectivity** (M13): que el backend sea alcanzable por IP desde otro dispositivo de la
  misma red, y que un cliente HTTP cualquiera pueda hacerle requests. No implica ninguna
  autorización — es una condición de red, no de seguridad.
- **Device authorization** (M14, sobre la base de los Milestones 6/7): que ese dispositivo tenga
  una identidad estable (`deviceId`) y una credential válida y no revocada. Estar en la misma LAN
  ya **no** implica poder usar la API — hace falta, además, estar autenticado y autorizado.

```
Dispositivo LAN
      │
      ▼
¿Puede alcanzar el backend por IP?  ← LAN connectivity (M13)
      │
      ▼
¿Tiene una credential activa?       ← Device authorization (M14 + Milestones 6/7)
      │
   ┌──┴──┐
   NO    SÍ
   │      │
 401     API
```

## Qué agregó M14

El backend de auth/pairing/device-management **ya existía** (Milestones 6/7) — M14 no lo
reescribió. Lo nuevo:

1. **`GET /auth/pairing/:id`** — estado de una sesión de pairing (`pending | confirmed | expired |
cancelled`), para que quien generó el QR sepa cuándo el otro dispositivo confirmó. Protegido
   igual que `create`/`cancel`; nunca expone el token ni el código.
2. **`deviceId` en los logs HTTP** — `RequestContextMiddleware` ahora incluye
   `metadata.deviceId` en `http.request.completed`/`failed` cuando el request está autenticado.
3. **CORS con allowlist explícita** — reemplaza el `app.enableCors()` abierto de M13 (ver
   §CORS más abajo).
4. **UI de Desktop** (`apps/desktop/renderer/src/features/devices/`) — pantalla "Dispositivos":
   listar, revocar, y emparejar un dispositivo nuevo (genera el QR + código, hace polling del
   estado, permite cancelar).
5. **Pairing real en el Web Client** (`apps/web-client`) — ya no es solo una prueba de
   conectividad: ahora puede emparejarse, guardar su credential, autenticar sus requests, y
   detectar cuándo pierde acceso.

No se tocó ninguna otra pieza de los Milestones 6/7 (`PairingService.confirmPairing`,
`DevicesService`, `CredentialService`, las migraciones existentes, los guards).

## Decisión de diseño: no hay estado `PENDING`

El modelo de `devices.status` sigue siendo `active | revoked` (sin cambios). No se agregó un
tercer estado `PENDING` con un botón "Authorize" separado, aunque conceptualmente podría parecer
necesario. Razón: la autorización explícita **ya está garantizada** por el diseño del pairing —

```
Código de verificación
      │
      ▼
Solo visible en un Desktop YA autenticado
      │
      ▼
Solo quien tiene acceso físico/de red a ESE Desktop puede leerlo
      │
      ▼
Confirmar el pairing con ese código = la autorización explícita
```

Nadie se autoriza a sí mismo por el simple hecho de aparecer en la LAN — necesita el pairing
token (del QR) **y** el código de verificación (mostrado solo en el Desktop ya autenticado, nunca
dentro del QR). Agregar un `PENDING` + un paso de aprobación posterior sería redundante con esta
garantía, y hubiera requerido modificar el schema y los servicios de un milestone ya cerrado y
probado — evitado deliberadamente (ver `docs/security/NEXT_STEPS.md`).

## Decisión de diseño: sin distinción 401 vs. 403 para "revocado"

`ApiAccessGuard` devuelve siempre `401` genérico ante cualquier falla de autenticación (credential
ausente, inválida, o de un dispositivo revocado) — decisión de anti-enumeración ya tomada y
probada en los Milestones 6/7, sin cambios en M14. El Web Client no intenta distinguir el motivo:
cualquier `401` en un endpoint protegido se interpreta como "este dispositivo ya no puede usar la
API", limpia la credential guardada, y vuelve a la pantalla de pairing.

## Endpoint nuevo: `GET /auth/pairing/:id`

Protegido (mismo criterio que `POST /auth/pairing` y `POST /auth/pairing/cancel` — requiere una
credential válida, típicamente la del Desktop que generó el pairing).

```json
{
  "pairingId": "7a66a403-df4b-44c4-95c0-ae41219c152a",
  "status": "pending",
  "expiresAt": "2026-09-15T14:46:21.000Z"
}
```

Nunca incluye el token ni el `verificationCode`. El Desktop lo consulta cada ~2 segundos mientras
el diálogo de pairing está abierto (sin WebSockets) hasta que `status` deja de ser `pending`.

## CORS

M13 dejó `app.enableCors()` sin `origin` explícito (refleja `*`) — aceptable en ese momento porque
todavía no existía autenticación real de dispositivos LAN. Ahora que sí existe, M14 restringe a
una allowlist explícita (`apps/backend/src/config/cors-origin.ts`):

- Sin header `Origin` (clientes no-browser: curl, apps nativas) → permitido — CORS no aplica ahí
  de todos modos.
- `http://localhost:5173` (renderer de Electron en dev).
- `http://localhost:5544` (Web Client en dev, puerto fijo — ver `LAN_TESTING.md`).
- `http://<cualquier-IP-LAN>:5544` (Web Client accedido desde otro dispositivo de la LAN, mismo
  puerto).
- Orígenes adicionales vía `CORS_ALLOWED_ORIGINS` (coma-separado, `apps/backend/.env`) — para un
  build empaquetado del Desktop o un futuro cliente Mobile, sin tocar código.

**Recordatorio (ya documentado en M13, sigue aplicando):** CORS no reemplaza autenticación. La
barrera de seguridad real sigue siendo `ApiAccessGuard`/`API_ACCESS_MODE` — CORS es una capa
adicional de defensa en profundidad, útil contra un sitio malicioso abierto en el navegador de
alguien en la misma LAN, no contra un cliente HTTP directo (que no está sujeto a CORS).

## Pairing desde el Desktop

`Devices` → `Emparejar dispositivo` (`apps/desktop/renderer/src/features/devices/`):

1. Al abrir el diálogo, se llama `POST /auth/pairing` (usando la credential del propio Desktop,
   inyectada automáticamente a nivel de sesión de Electron — el renderer nunca la maneja).
2. Se renderiza el QR (payload `PairingQrPayload`, librería `qrcode`, client-side) y se muestra el
   código de verificación en grande, con cuenta regresiva hasta `expiresAt`.
3. Se hace polling de `GET /auth/pairing/:id` cada 2 segundos mientras el estado sea `pending`.
4. Cuando pasa a `confirmed`, se muestra la confirmación y se refresca la lista de dispositivos.
5. `Cancelar pairing` llama `POST /auth/pairing/cancel`.

El Desktop **nunca ve la credential** del dispositivo que confirma — esa credential solo la recibe
el dispositivo nuevo, como respuesta directa de `POST /auth/pairing/confirm` (ver
`docs/security/PAIRING.md` §Principio de seguridad).

## Administración de dispositivos desde el Desktop

`Devices` lista todos los dispositivos (`GET /auth/devices`, requiere el Desktop autenticado como
administrador — ver `docs/security/DEVICE_MANAGEMENT.md` §Quién puede administrar dispositivos),
mostrando nombre, tipo, estado (`Autorizado`/`Revocado`) y último acceso relativo. Cada
dispositivo activo tiene un botón `Revocar`, con un diálogo de confirmación que deja explícito que
la revocación es permanente (no existe "reactivar" — ver
`docs/security/DEVICE_MANAGEMENT.md` §Revocación permanente).

## Pairing y autenticación en el Web Client

`apps/web-client` dejó de ser un cliente sin autenticación (M13) y ahora implementa el flujo
completo:

1. **Sin credential guardada** → muestra el formulario de pairing: un campo para pegar el JSON
   del QR (este cliente de prueba no escanea la cámara, ver `docs/security/PAIRING.md` §UI /
   generación de QR — la persona copia el JSON mostrado en el Desktop), el código de verificación,
   y un nombre de dispositivo opcional.
2. Al confirmar (`POST /auth/pairing/confirm`), guarda la credential recibida y pasa a mostrar
   `Load Products` habilitado.
3. Cada request subsiguiente adjunta `Authorization: Bearer <credential>`.
4. Un `401` en cualquier momento (dispositivo revocado, o credential inválida) limpia la
   credential guardada y vuelve a mostrar el formulario de pairing, con el mensaje "Device access
   revoked. Please pair this device again."

### Storage del token en el Web Client

`localStorage` (`apps/web-client/src/credential-store.ts`) — **solución de desarrollo/prototipo**,
documentada como tal en el propio código y en el banner de la UI. No se usa para nada más que
esto: no está en `.env`, no viaja por URL, no se imprime por consola, no se loggea, y nunca se
guarda en SQLite del servidor (el servidor solo guarda el hash de la credential, nunca la
credential en sí — ver `docs/security/API_ACCESS.md`). Antes de un cliente web de producción real,
esto debería revisarse (por ejemplo, reconsiderar si `localStorage` es aceptable dado que
cualquier script en el mismo origen puede leerlo).

## Headers

`Authorization: Bearer <device-token>` — mismo estándar ya usado por Electron y por todos los
tests de backend, sin headers propios inventados.

## Logging

Cada request autenticado deja `deviceId` (además de `requestId`/`clientIp`/`method`/`path`/
`statusCode`/`durationMs`, ya existentes desde M13) en `http.request.completed`/`failed`. Nunca se
loggea el header `Authorization` ni ninguna credential/token/código — cubierto por los tests de
backend existentes y por el nuevo test end-to-end (ver §Tests).

## Troubleshooting

- **El Web Client no puede emparejarse ("código o datos incorrectos")**: el pairing expira a los 5
  minutos (`PAIRING_EXPIRATION_MINUTES`) y es de un solo uso — generar uno nuevo desde el Desktop.
  Verificar también que el JSON pegado sea el completo (incluye `pairingId` y `token`).
- **"Device access revoked" apareció sin que nadie lo revocara a propósito**: revisar
  `apps/backend/data/logs/app.log` buscando `device.revoked` con ese `deviceId` — si no hay
  ninguno, es más probable que la credential guardada en `localStorage` haya quedado de una
  instalación anterior del backend (por ejemplo, tras borrar la base de datos) — volver a
  emparejar.
- **CORS bloquea el Web Client en un puerto distinto de 5544**: agregar el origen a
  `CORS_ALLOWED_ORIGINS` en `apps/backend/.env` (ver §CORS).
- Para el resto (firewall, `PAIRING_HOST`, `VITE_API_URL`), ver
  [`LAN_TESTING.md`](./LAN_TESTING.md), que sigue vigente sin cambios.

## Cómo agregar un dispositivo

1. Desde el Desktop: `Devices` → `Emparejar dispositivo`.
2. Copiar el JSON mostrado bajo el QR (o escanearlo, si el cliente lo soporta) y anotar el código
   de verificación.
3. Desde el nuevo dispositivo: pegar el JSON + el código en su formulario de pairing (el Web
   Client de prueba, u otro cliente futuro) y confirmar.
4. El dispositivo queda activo de inmediato — no hace falta un paso de aprobación separado (ver
   §Decisión de diseño: no hay estado PENDING).

## Cómo revocarlo

Desde el Desktop: `Devices` → seleccionar el dispositivo → `Revocar`. Efecto inmediato: su próxima
request devuelve `401`.

## Cómo volver a emparejarlo

No existe reactivación (ver `docs/security/DEVICE_MANAGEMENT.md` §Revocación permanente). El
único camino es un pairing nuevo desde el Desktop, que crea un dispositivo y una credential
completamente nuevos e independientes de los anteriores.

## Tests

- Backend: `apps/backend/src/auth/pairing/pairing.service.spec.ts` y `pairing.e2e.spec.ts`
  (estado de pairing), `apps/backend/src/config/cors-origin.spec.ts` (allowlist de CORS),
  `apps/backend/src/auth/device-management-flow.e2e.spec.ts` (escenario completo: pairing → uso →
  `lastSeenAt` → revocación → `401`, con verificación de `deviceId`/`requestId`/`clientIp` en los
  logs y ausencia total de secretos).
- Desktop: `apps/desktop/renderer/src/features/devices/**/*.spec.tsx` (lista, revocar, pairing
  completo con polling simulado).
- Web Client: `apps/web-client/src/{credential-store,pairing,api}.spec.ts` (guardado/limpieza de
  credential, parseo del QR pegado, header de autenticación, manejo de `401`).

## Prueba manual con dos dispositivos

Ver `docs/lan/LAN_TESTING.md` §Prueba manual para cómo levantar el backend y el Web Client entre
dos máquinas de la misma LAN (sin cambios respecto a M13). Una vez ambos corriendo:

1. **Máquina A**: abrir el Desktop → `Devices` → `Emparejar dispositivo` → dejar el QR/código en
   pantalla.
2. **Máquina B**: abrir el Web Client (`http://<IP-A>:5544`) → pegar el JSON del QR + el código →
   `Pair`.
3. **Máquina A**: ver el nuevo dispositivo aparecer como `Autorizado` en la lista.
4. **Máquina B**: `Load Products` debería funcionar.
5. **Máquina A**: `Revocar` ese dispositivo.
6. **Máquina B**: `Load Products` de nuevo → "Device access revoked. Please pair this device
   again."
7. Revisar `app.log` en la Máquina A: `deviceId`, `requestId`, `clientIp` en cada paso, sin ningún
   secreto.

Este flujo fue verificado en esta sesión de forma equivalente con dos procesos en la misma
máquina (backend + Web Client real en el navegador, con el rol del Desktop simulado vía la misma
API que usa la UI real) — ver el reporte final de la implementación para el detalle. La prueba con
una segunda máquina física de la LAN queda pendiente de que el usuario la ejecute, igual que ya
ocurrió con M13.
