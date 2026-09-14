# Device Management

Complementa [`API_ACCESS.md`](./API_ACCESS.md) y [`PAIRING.md`](./PAIRING.md) — léelos primero
para el modelo general de autenticación (`Device`, `credential`, `ApiAccessGuard`) y para cómo
llegan nuevos dispositivos al sistema (`bootstrap`/`pairing`). Este documento cubre cómo se
**administran** los dispositivos ya registrados: listarlos, consultarlos, renombrarlos, y —lo más
importante— revocarlos permanentemente.

Este milestone entrega la API y la infraestructura. **No** entrega una UI — React/Electron podrán
construirla después sobre estos endpoints, sin necesitar ningún cambio de backend.

## Endpoints

| Método | Ruta                         | Quién puede llamarlo                  | Qué hace                              |
| ------ | ---------------------------- | -------------------------------------- | --------------------------------------- |
| `GET`  | `/auth/devices`              | Solo dispositivo administrador          | Lista todos los dispositivos.           |
| `GET`  | `/auth/devices/me`           | Cualquier dispositivo autenticado       | Info del dispositivo que hace la request. |
| `GET`  | `/auth/devices/:id`          | Solo dispositivo administrador          | Info de un dispositivo puntual.         |
| `PATCH`| `/auth/devices/:id`          | Solo dispositivo administrador          | Renombra un dispositivo (`{ "name": "..." }`). |
| `POST` | `/auth/devices/:id/revoke`   | Solo dispositivo administrador          | Revoca un dispositivo permanentemente.  |

Ningún endpoint de esta lista es `@Public()` — todos exigen, como mínimo, estar autenticado
(`ApiAccessGuard`); los marcados "solo dispositivo administrador" exigen además pasar
`AdminDeviceGuard` (ver más abajo).

### Ejemplo de respuesta (`DeviceDto`)

```json
{
  "id": "4166259f-e4e9-4e57-a4e2-7eb1764d99d5",
  "name": "Juan Android",
  "type": "mobile",
  "active": true,
  "isAdmin": false,
  "createdAt": "2026-09-14T05:54:52.000Z",
  "lastSeenAt": "2026-09-14T05:55:02.000Z"
}
```

**Nunca** incluye `credentialHash`, la credential, el pairing token, ni ningún otro secreto —
`DevicesService` mapea explícitamente cada fila de `devices` a este DTO (`toDto()`), nunca
devuelve la fila cruda de la base de datos.

`type` reutiliza el `DeviceType` existente (`desktop | mobile | tablet | web | other`,
`packages/api-contracts/src/auth/auth.contract.ts`) — no se creó un enum paralelo.

## `GET /auth/devices/me`

Pensado especialmente para clientes móviles, que necesitan saber "quién soy" sin depender de
conocer su propio `deviceId` de antemano. Se resuelve **siempre** desde `request.device` (poblado
por `ApiAccessGuard` al autenticar), nunca desde un parámetro de la URL — así que no existe forma
de que un dispositivo consulte la información de otro manipulando un `id`: `/me` no tiene `id` en
absoluto.

Nota de implementación de rutas: `GET /auth/devices/me` está declarado **antes** que
`GET /auth/devices/:id` en `DevicesController` — Nest/Express registra las rutas de un controller
en el orden en que se declaran los métodos, así que si `:id` se declarara primero, capturaría
`"me"` como si fuera un id (y `ParseUUIDPipe` lo rechazaría con `400`).

## Quién puede administrar dispositivos

No existe (todavía) un sistema de usuarios/roles/permisos — ver `NEXT_STEPS.md` y la sección
"No implementar" de este milestone. Sin uno, dejar `GET/PATCH/POST /auth/devices*` abiertos a
*cualquier* dispositivo autenticado significaría que un celular emparejado podría listar, renombrar
o revocar cualquier otro dispositivo, incluido el propio desktop administrador — inaceptable.

La solución mínima: un campo `devices.is_admin` (boolean, default `false`). El dispositivo creado
por `/auth/bootstrap` —el primero de la instalación, típicamente el Electron desktop— nace con
`is_admin: true`. Todo dispositivo creado por pairing (`/auth/pairing/confirm`) nace con
`is_admin: false`, sin excepción. No hay manera de promover un dispositivo a administrador en este
milestone (ni un endpoint para eso) — es intencional, para no abrir esa superficie sin necesidad
real todavía.

Esto **no** es un sistema de roles/permisos genérico: es un único booleano, con un único
significado ("puede administrar dispositivos"), aplicado a un único recurso (`/auth/devices/*`). Si
en el futuro se necesita algo más granular (roles, permisos por recurso, multiusuario), ese es
Milestone RBAC — no se adelanta acá.

### `AdminDeviceGuard`

`apps/backend/src/auth/guards/admin-device.guard.ts` — un guard aplicado **por ruta**
(`@UseGuards(AdminDeviceGuard)`), no global como `ApiAccessGuard`. Corre siempre después de
`ApiAccessGuard` (que ya autenticó la request y populó `request.device.isAdmin`), así que:

- Si `request.device?.isAdmin` es `true` → pasa.
- Si no → `403 Forbidden` (no `401`: el dispositivo **sí** está autenticado, solo le falta el
  privilegio de administrador — son conceptos distintos, y el código HTTP lo refleja).
- En `API_ACCESS_MODE=development` deja pasar todo, igual que `ApiAccessGuard` — no tendría sentido
  exigir un dispositivo administrador cuando ni siquiera se exige autenticación.

```
Request
   ↓
ApiAccessGuard        (autentica — 401 si falla)
   ↓
request.device = { id, name, isAdmin }
   ↓
AdminDeviceGuard       (autoriza — 403 si no es admin; solo en rutas admin-only)
   ↓
DevicesController → DevicesService → DevicesRepository → SQLite
```

## Renombrar un dispositivo

`PATCH /auth/devices/:id`, body `{ "name": "..." }`, validado con Zod
(`updateDeviceSchema`, `packages/validation/src/auth/auth.schema.ts`):

- 1–100 caracteres, sin espacios en blanco al principio/final (`trim()`).
- No permite string vacío.
- Rechaza caracteres de control (`< 0x20` o `0x7f`) — sin sanitización HTML: el backend no asume
  que el nombre se va a renderizar como HTML, esa responsabilidad es de quien lo muestre.

Solo permite cambiar `name`. `type`, `active` e `isAdmin` no son editables por este endpoint —
`active` se controla exclusivamente vía `/revoke` (nunca seteando el campo directamente), y no
existe ningún endpoint para cambiar `isAdmin` en este milestone (ver más arriba).

## `lastSeenAt`

Sin cambios respecto al Milestone 5 (`DevicesService.touchLastSeen`, ver `API_ACCESS.md`
§`last_seen_at`) — throttled a como mucho una escritura por minuto por dispositivo. Device
Management solo lo **expone** (en el DTO); no cambia cómo se actualiza.

## Revocación permanente

`POST /auth/devices/:id/revoke` es la operación de seguridad más importante de este milestone.

```
Device activo
      ↓
POST /auth/devices/:id/revoke
      ↓
devices.status = 'revoked'   (persistido, permanente)
      ↓
Bearer <credential vieja>
      ↓
ApiAccessGuard
      ↓
401 Unauthorized
```

**No existe reactivación.** No hay, y no debe agregarse, ningún endpoint
`reactivate`/`restore`/`enable`/`unrevoke`. `DevicesService` no expone ningún método para volver a
poner un device en `active` una vez `revoked` — no es una limitación temporal, es la decisión de
diseño para este sistema. Si un dispositivo revocado necesita volver a tener acceso, el único
camino es:

```
Nuevo pairing → Nuevo Device → Nueva credential
```

Un dispositivo revocado **no se elimina físicamente** — permanece en `devices` con `active: false`
para siempre, visible en `GET /auth/devices`, por auditoría/historial/troubleshooting. Ver
`DevicesRepository` — no existe ningún método `delete()`.

### Idempotencia

Revocar un dispositivo ya revocado no falla ni produce un estado distinto: `DevicesService.revoke()`
detecta que ya está `revoked` y devuelve su estado actual sin volver a auditar el evento ni tocar
la fila — un segundo click accidental en "revocar" en una futura UI no es un error.

## Protección contra auto-revocación del único administrador

Si el único dispositivo administrador se revocara a sí mismo, la instalación quedaría sin ningún
dispositivo capaz de administrar dispositivos — nadie podría volver a listar, renombrar, ni revocar
nada vía `/auth/devices/*` (el pairing seguiría funcionando para cualquier dispositivo autenticado,
pero ya no habría forma de gestionar lo administrado).

`DevicesService.revoke(deviceId, requestedByDeviceId)` bloquea exactamente ese caso:

```ts
if (requestedByDeviceId === deviceId && row.isAdmin && countActiveAdmins() <= 1) {
  throw new ConflictException(...); // 409
}
```

- Solo aplica a **auto**-revocación (`requestedByDeviceId === deviceId`) de un dispositivo
  **administrador** — un admin revocando a otro dispositivo (admin o no) nunca está restringido por
  esta regla.
- Solo bloquea si es el **único** admin activo (`countActiveAdmins() <= 1`) — no existe hoy una
  forma de crear un segundo dispositivo administrador (ver §Quién puede administrar dispositivos),
  así que en la práctica esto casi siempre bloquea la auto-revocación del admin de bootstrap. Si en
  el futuro se agrega una forma de promover dispositivos a admin, esta protección sigue siendo
  correcta sin cambios.
- Devuelve `409 Conflict` con un mensaje descriptivo (no es información sensible tipo
  credential/token — es una regla de negocio legítima que el propio administrador necesita
  entender, igual que "el SKU ya está en uso" en Products).

No es un sistema de "ownership" complejo — no hay conceptos de propietario/delegado ni jerarquías
de administradores, solo la pregunta puntual "¿esto dejaría la instalación sin ningún admin activo?".

## Seguridad de los `:id`

`GET/PATCH/POST /auth/devices/:id[...]` validan el formato del `id` con `ParseUUIDPipe` (built-in
de NestJS) antes de que la request llegue al controller — un `id` mal formado devuelve `400 Bad
Request` limpio, nunca un error interno de SQLite ni un stack trace. Como Drizzle usa siempre
queries parametrizadas (nunca concatenación de strings), no hay superficie de inyección SQL
independientemente del formato del `id` — la validación es defensiva y da mejores errores, no un
parche de seguridad crítico.

Un `id` con formato válido pero inexistente devuelve `404 Not Found` genérico (`"Dispositivo no
encontrado"`) — a diferencia de las respuestas de `ApiAccessGuard`/pairing (que deliberadamente no
distinguen "no existe" de "credential inválida" para no dar pie a enumeración), acá sí es
aceptable un `404` explícito: quien llama estos endpoints ya está autenticado como el dispositivo
administrador, no es un actor sin ninguna credential probando IDs al azar.

## Auditoría / Logging

Reutiliza `AppLogger`/`RequestContext`/`GlobalExceptionFilter` — mismo sistema del Milestone 4, sin
duplicar nada. Eventos:

| Evento                  | Nivel | Cuándo                                                        |
| ------------------------ | ----- | ---------------------------------------------------------------- |
| `device.listed`          | INFO  | `GET /auth/devices`.                                              |
| `device.viewed`          | INFO  | `GET /auth/devices/:id` o `/me`.                                  |
| `device.updated`         | INFO  | `PATCH /auth/devices/:id` (renombrado exitoso).                   |
| `device.revoked`         | INFO  | `POST /auth/devices/:id/revoke` exitoso.                          |
| `device.access.denied`   | WARN  | `AdminDeviceGuard` rechazó a un dispositivo no administrador.     |
| `device.created`         | INFO  | Ya existía desde Milestone 6 — compartido entre bootstrap y pairing. |

Metadata incluida cuando es útil: `deviceId`, `deviceType`, `requestedBy` (el `deviceId` de quien
hizo la request administrativa), `requestId` (automático, vía `RequestContext`).

**Nunca se registra**: `credential`, `credentialHash`, el header `Authorization`, el pairing token,
ni el verification code. Cubierto por tests (`devices.e2e.spec.ts`).

Toda operación administrativa es rastreable de punta a punta por `requestId` (mismo mecanismo del
Milestone 4, no uno nuevo):

```
requestId=abc
    ↓
device.updated  (deviceId=123, requestedBy=<adminId>)
```
```
requestId=def
    ↓
device.revoked  (deviceId=456, requestedBy=<adminId>)
```

## Errores HTTP

Mismo `GlobalExceptionFilter` existente — sin sistema paralelo. Nunca se devuelve stack trace,
hashes, credentials, ni detalle interno de autenticación. Resumen de códigos usados en
`/auth/devices/*`:

| Código | Cuándo                                                                 |
| ------ | ------------------------------------------------------------------------ |
| `400`  | `:id` con formato inválido (no UUID), o body que no pasa `updateDeviceSchema`. |
| `401`  | Sin credential o credential inválida/revocada (`ApiAccessGuard`).         |
| `403`  | Credential válida pero el dispositivo no es administrador (`AdminDeviceGuard`). |
| `404`  | `id` con formato válido pero inexistente.                                 |
| `409`  | Intento de auto-revocar el único dispositivo administrador activo.        |

## `pairing_sessions.device_id`

Milestone 6 dejó esto documentado como pendiente en `NEXT_STEPS.md`. Decisión tomada en este
milestone: **se agregó la FK real** (`pairing_sessions.device_id` → `devices.id`, migración
`0005_crazy_carnage.sql`).

Razonamiento:

- Los devices **nunca se eliminan físicamente** (ver §Revocación permanente) — solo se revocan.
  Por lo tanto, una referencia `pairing_sessions.device_id → devices.id` **nunca puede quedar
  huérfana**: no existe ningún camino en el código que borre un `Device` referenciado.
- La FK no agrega ninguna restricción nueva al flujo real (no se configuró `onDelete`, porque nunca
  hay un `DELETE` sobre `devices` que la dispare) — solo formaliza, a nivel de esquema, una
  invariante que el código ya garantizaba.
- `device_id` sigue siendo `null` mientras la sesión está `PENDING`/`EXPIRED`/`CANCELLED` (nunca se
  llegó a crear un `Device`); solo se completa al `CONFIRMED`, y una vez confirmado, permanece para
  siempre — incluso si ese `Device` se revoca después (`device_id` no se limpia ni se actualiza al
  revocar: sigue siendo cierto que "este pairing produjo ese device", sin importar su estado
  actual).
- SQLite no soporta agregar una FK a una columna existente vía `ALTER TABLE` — Drizzle generó la
  migración con el patrón estándar para SQLite (crear tabla nueva con la FK, copiar los datos,
  borrar la vieja, renombrar), verificado manualmente en `0005_crazy_carnage.sql`. No hay pérdida
  de datos: es una migración aditiva sobre una tabla de sesiones efímeras.
- `PRAGMA foreign_keys = ON` ya estaba activo desde `DatabaseModule` (Milestone "Sales") y en
  `createTestDb()` — la FK queda efectivamente aplicada, no es solo documentación.

## Fuera de alcance de este milestone

No implementado (y no debería inferirse de este documento): UI de Device Management en
React/Electron, eliminación física de dispositivos, roles/permisos granulares, promoción de un
dispositivo cliente a administrador, multiusuario, notificaciones de revocación al dispositivo
afectado (push, WebSocket), analíticas de uso por dispositivo. Ver `API_ACCESS.md` §Limitaciones
para las limitaciones del modelo de seguridad local, que siguen aplicando.
