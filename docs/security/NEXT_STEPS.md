# Próximos pasos / pendientes técnicos de seguridad

Este documento registra decisiones y puntos de integración que se dejaron **deliberadamente** para
más adelante — cuando exista la UI de Pairing y el milestone de Device Management — para no
adelantar abstracciones ni features fuera del alcance del milestone en el que se originaron.

Que un punto esté listado acá **no significa que el milestone correspondiente esté incompleto**:
son decisiones conscientes de scope, no deuda técnica accidental.

---

## Milestone 6 — Pairing: pendientes para Frontend / Device Management

Contexto: el Milestone 6 (pairing de dispositivos vía QR + código de verificación) está
implementado y cerrado — ver [`PAIRING.md`](./PAIRING.md) y [`API_ACCESS.md`](./API_ACCESS.md).
96 tests pasan, `typecheck`/`lint`/`build` pasan, y el flujo completo (crear pairing → confirmar →
credential → request autenticado → revocar) fue verificado contra el backend compilado real, sin
secretos en los logs. Los puntos de abajo son trabajo futuro, no correcciones sobre lo ya
implementado.

### 1. Revisar `pairing_sessions.device_id` — ✅ Implementado (Milestone 7)

~~Actualmente `pairing_sessions.device_id` no tiene una Foreign Key real hacia `devices.id`~~ —
**resuelto en el Milestone 7**: se agregó la FK real (migración `0005_crazy_carnage.sql`). Ver
[`DEVICE_MANAGEMENT.md`](./DEVICE_MANAGEMENT.md) §`pairing_sessions.device_id` para el
razonamiento completo. Resumen de las preguntas que quedaron abiertas acá:

- **¿Se agregó la FK?** Sí — los devices nunca se eliminan físicamente (solo se revocan), así que
  la referencia nunca puede quedar huérfana; la FK solo formaliza esa invariante.
- **¿`device_id` nullable mientras `PENDING`?** Sí, sigue siendo `null` en `PENDING`/`EXPIRED`/
  `CANCELLED` — nunca se llegó a crear un device en esos casos.
- **¿Qué pasa al cancelar/expirar?** Nada — `device_id` nunca se completó, no hay nada que limpiar.
- **¿Qué pasa al confirmar?** Se persiste el `id` del device recién creado, de forma permanente.
- **¿Se conserva el histórico tras una revocación?** Sí — `device_id` no se toca al revocar el
  device; sigue siendo cierto que "este pairing produjo ese device", sin importar su estado actual.
- **¿Eliminación futura de devices?** No aplica: este milestone confirmó explícitamente que los
  devices no se eliminan físicamente (ver `DEVICE_MANAGEMENT.md` §Revocación permanente) — si eso
  cambiara alguna vez, habría que revisar esta FK entonces, no antes.

### 2. Validar `PAIRING_HOST`

Actualmente `PAIRING_HOST` es un override opcional (`packages/validation/src/env/backend-env.schema.ts`,
tipado como `z.string().optional()`, sin validación de formato). El sistema usa
`os.networkInterfaces()` para autodetectar la primera IPv4 no interna (`resolveLanHost()` en
`apps/backend/src/auth/pairing/lan-address.ts`); si se especifica `PAIRING_HOST`, se usa
directamente, sin validar que sea una IP o hostname válido.

**Pendiente para cuando exista una UI de configuración de Pairing/LAN:**

- Agregar validación más estricta del valor (hoy cualquier string pasa).
- Comprobar que sea una IP/hostname válido según el formato que se decida soportar.
- Mostrar un error claro al usuario si el valor es inválido, en vez de generar un QR silenciosamente
  incorrecto.
- Evitar generar un QR con un host evidentemente incorrecto (ej. vacío, con espacios, con
  protocolo incluido por error).
- Definir formalmente qué formatos se soportan: IPv4, IPv6, hostname, `localhost` (probablemente
  no, ver `PAIRING.md` §Host/red), nombres `.local` (mDNS — explícitamente fuera de alcance del
  Milestone 6).

**No cambiar la configuración actual solo por este pendiente.** Resolverlo cuando exista la
interfaz de configuración o se defina formalmente el protocolo LAN.

### 3. Generación real del QR

El backend (`PairingService.createPairing()`) devuelve un payload estructurado y versionado
(`PairingQrPayload`, `packages/api-contracts/src/auth/auth.contract.ts`) preparado para
convertirse en QR. El backend **no** genera una imagen QR — es intencional (ver `PAIRING.md`
§UI/generación de QR): la responsabilidad de renderizado es de la UI, no del dominio de seguridad.

**Pendiente para Frontend:**

```text
PairingService.createPairing()
        ↓
QR payload
        ↓
Frontend
        ↓
QR visual
```

La UI debería mostrar, como mínimo:

- El QR.
- El código de verificación (fuera del QR — es el segundo factor, ver `PAIRING.md`).
- El tiempo restante antes de expirar.
- El estado del pairing (`pending` / `confirmed` / `expired` / `cancelled`).
- Una opción para cancelar (`POST /auth/pairing/cancel`, ya implementado en el backend).
- Feedback cuando el dispositivo fue vinculado exitosamente.
- Feedback cuando expiró sin confirmarse.

**Importante:** el frontend nunca debe transformar el pairing token en una credential permanente.
El token del QR es temporal y de un solo uso. La credential permanente solo debe entregarse al
dispositivo nuevo como respuesta de una confirmación exitosa (`POST /auth/pairing/confirm`), nunca
derivada ni reconstruida en el cliente.

### 4. Seguridad del frontend

Cuando se implemente la UI de Pairing, revisar especialmente que:

- El pairing token no se escriba en logs del renderer (consola del navegador/DevTools de Electron).
- El verification code no se escriba en logs.
- La credential nunca se muestre en pantalla más allá del momento en que el usuario necesita
  copiarla/confirmarla (si aplica a ese dispositivo en particular).
- La credential nunca se almacene en `localStorage` del renderer.
- La credential nunca se envíe/maneje desde código React si existe una capa segura de
  Electron/Main disponible para ese propósito (ver el patrón ya usado para el device credential
  del propio Electron: `safeStorage` + inyección a nivel de sesión, `API_ACCESS.md` §Almacenamiento
  de la credential en Electron).
- No se incluya información sensible (tokens, códigos, credentials) en mensajes de error visuales
  ni en reportes de crash/telemetría de la UI.
- No se permita copiar accidentalmente una credential permanente a logs o a salidas de
  debug/consola durante desarrollo.

### 5. UX del pairing

Cuando se implemente el frontend, el flujo esperado es aproximadamente:

```text
Crear nuevo dispositivo
        ↓
Generando pairing...
        ↓
Mostrar QR
        ↓
Mostrar código
        ↓
Esperar confirmación
        ↓
Dispositivo confirmado
        ↓
Mostrar nombre/tipo
        ↓
Pairing terminado
```

También contemplar, como estados de error/fin de flujo:

```text
Pairing expirado
Pairing cancelado
Código incorrecto
Token inválido
Servidor no disponible
Dispositivo ya vinculado
```

No implementar ahora — este documento solo deja el flujo esperado registrado para cuando se
construya la UI.

### 6. Device Management — ✅ Implementado (Milestone 7, backend)

Todo lo listado acá para "cuando comience Device Management" ya está resuelto a nivel de backend —
ver [`DEVICE_MANAGEMENT.md`](./DEVICE_MANAGEMENT.md):

- Listado de devices — ✅ `GET /auth/devices`.
- Nombre — ✅ incluido en el DTO, editable vía `PATCH /auth/devices/:id`.
- Tipo (`desktop | mobile | tablet | web | other`) — ✅ incluido en el DTO, mismo enum existente.
- Fecha de creación — ✅ incluida en el DTO.
- Último acceso (`lastSeenAt`) — ✅ incluido en el DTO (ya existía en el backend desde Milestone 5).
- Estado (`active | revoked`) — ✅ incluido en el DTO como `active: boolean`.
- Revocación — ✅ `POST /auth/devices/:id/revoke`, con protección contra dejar la instalación sin
  ningún dispositivo administrador (ver `DEVICE_MANAGEMENT.md` §Protección contra auto-revocación).
- Auditoría — ✅ eventos `device.listed/viewed/updated/revoked/access.denied` vía `AppLogger`.
- Relación con `pairing_sessions.device_id` — ✅ ver punto 1 (FK agregada).

**Lo que sigue pendiente** (fuera de alcance de este milestone, ver
`DEVICE_MANAGEMENT.md` §Fuera de alcance):

- La **UI** en React/Electron — el backend está listo, pero no hay pantalla todavía.
- Una forma de **promover** un dispositivo cliente a administrador (hoy solo el dispositivo de
  bootstrap nace admin; no hay endpoint para cambiar `isAdmin` de otro device). Si se necesita en
  el futuro, requiere decidir quién puede promover a quién — potencialmente el inicio de un
  sistema de roles más real, evaluarlo con cuidado en ese momento.
- Notificar al dispositivo afectado cuando es revocado (hoy simplemente deja de poder autenticarse
  en su próxima request — no hay push/WebSocket).

#### Regla de seguridad acordada: no existe reactivación de una credential revocada

```text
Device activo
    ↓
Revocar
    ↓
Credential invalidada permanentemente
    ↓
Device queda como histórico/revocado
    ↓
Nuevo pairing
    ↓
Nuevo device / nueva credential
```

**No implementar un botón "Reactivar".** Si el usuario quiere volver a usar un dispositivo cuya
credential fue revocada, el flujo correcto es un **nuevo pairing**, que genera un **nuevo** device
con su **propia** credential — nunca revivir la credential anterior. Esta regla ya es coherente con
la implementación actual: `DevicesService` no expone ningún método para volver a poner un device en
estado `active` una vez `revoked`.

### 7. No resolver estos puntos ahora

Este documento es únicamente un registro de pendientes. Ninguno de estos puntos implica, por sí
mismo, modificar ahora: el schema de `devices`, agregar Foreign Keys adicionales, modificar
`PAIRING_HOST`, agregar librerías de QR, modificar `PairingService`/`CredentialService`/
`ApiAccessGuard`/`DevicesService`, agregar un sistema de roles/permisos, modificar el flujo de
autenticación, o hacer refactors sobre los Milestones 6/7. La implementación actual permanece
intacta.

### 8. Tabla resumen

| Pendiente                              | Cuándo revisar      | Prioridad | Estado         |
| ---------------------------------------- | -------------------- | ---------: | -------------- |
| `pairing_sessions.device_id` FK          | Device Management     |      Media | Implementado   |
| Validación `PAIRING_HOST`                | Frontend/LAN config    |      Media | Pendiente      |
| Generación visual de QR                  | Frontend Pairing       |       Alta | Pendiente      |
| Seguridad de datos sensibles en UI       | Frontend Pairing       |       Alta | Pendiente      |
| UX de estados del pairing                | Frontend Pairing       |      Media | Pendiente      |
| Regla de revocación permanente           | Device Management      |       Alta | Implementada   |
| API de Device Management (backend)       | Device Management      |       Alta | Implementado   |
| UI de Device Management (frontend)       | Frontend Device Mgmt.  |       Alta | Pendiente      |
| Promoción de device cliente a admin      | Device Management (futuro) |  Baja | Pendiente      |

Estados posibles: `Pendiente` (no resuelto todavía) · `Definido`/`Definida` (la decisión ya está
tomada, falta implementarla) · `Implementado`/`Implementada` (ya resuelto en código).

### 9. Relación con los milestones

```text
Milestone 6 — Pairing / QR
        ↓
Pendientes documentados (este archivo)
        ↓
Milestone 7 — Device Management (backend) ← ya implementado
        ↓
Frontend Pairing / Device Management ← todavía pendiente
        ↓
LAN / Multi-device
```

Estos puntos no significan que los Milestones 6/7 estén incompletos: son decisiones y puntos de
integración que deliberadamente se dejaron para cuando exista la UI (o, en el caso de la promoción
a administrador, para cuando exista una necesidad real de más de un dispositivo administrador), en
línea con el principio ya aplicado en este proyecto de no construir abstracciones antes de tener
una necesidad real (ver `apps/backend/src/core/README.md`).
