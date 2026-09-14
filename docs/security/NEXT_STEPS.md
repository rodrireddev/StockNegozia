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

### 1. Revisar `pairing_sessions.device_id`

Actualmente `pairing_sessions.device_id` **no** tiene una Foreign Key real hacia `devices.id` — es
un campo de texto libre, usado principalmente para auditoría y correlación en logs (ver
`PairingRepository`/`PairingService`), no como referencia activa de la que otro código dependa.

**Pendiente para Device Management**, evaluar:

- Si conviene agregar integridad referencial mediante una FK real hacia `devices.id`.
- Si `device_id` debe seguir siendo nullable mientras el pairing está `PENDING` (hoy lo es: solo
  se completa al confirmar).
- Qué debe suceder con `device_id` al **cancelar** una sesión (hoy no aplica: nunca se llegó a
  crear un device).
- Qué debe suceder al **expirar** una sesión (mismo caso: `device_id` nunca se completó).
- Qué debe suceder cuando el pairing se **confirma** (hoy: se persiste el `id` del device recién
  creado, de forma permanente).
- Si se debe **conservar el `device_id` histórico** después de una revocación del device (para
  mantener la trazabilidad de "este device vino de este pairing"), o si debería limpiarse.
- Comportamiento ante una eventual **eliminación** (no solo revocación) de devices en el futuro —
  hoy no existe eliminación de devices, solo revocación (ver punto 6).

**No modificar esto ahora.** Queda registrado como decisión pendiente para cuando se trabaje en
Device Management.

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

### 6. Device Management

Este documento también sirve como recordatorio para el próximo milestone. Cuando comience Device
Management, revisar:

- Listado de devices.
- Nombre.
- Tipo (`desktop | mobile | tablet | web | other`).
- Fecha de creación.
- Último acceso (`lastSeenAt`, ya existe en el backend — ver `API_ACCESS.md` §`last_seen_at`).
- Estado (`active | revoked`).
- Revocación (la capacidad ya existe a nivel de servicio — `DevicesService.revoke()` — sin
  endpoint HTTP ni UI todavía).
- Auditoría.
- Relación con `pairing_sessions.device_id` (ver punto 1).

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
mismo, modificar ahora: el schema de `devices`, agregar Foreign Keys, modificar `PAIRING_HOST`,
agregar librerías de QR, modificar `PairingService`/`CredentialService`/`ApiAccessGuard`, agregar
Device Management, modificar el flujo de autenticación, o hacer refactors sobre el Milestone 6. La
implementación actual permanece intacta.

### 8. Tabla resumen

| Pendiente                          | Cuándo revisar      | Prioridad | Estado    |
| ----------------------------------- | -------------------- | ---------: | ---------- |
| `pairing_sessions.device_id` FK     | Device Management     |      Media | Pendiente |
| Validación `PAIRING_HOST`           | Frontend/LAN config    |      Media | Pendiente |
| Generación visual de QR             | Frontend Pairing       |       Alta | Pendiente |
| Seguridad de datos sensibles en UI  | Frontend Pairing       |       Alta | Pendiente |
| UX de estados del pairing           | Frontend Pairing       |      Media | Pendiente |
| Regla de revocación permanente      | Device Management      |       Alta | Definida  |

Estados posibles: `Pendiente` (no resuelto todavía) · `Definido` (la decisión ya está tomada,
falta implementarla) · `Implementado` (ya resuelto en código).

### 9. Relación con los milestones

```text
Milestone 6 — Pairing / QR
        ↓
Pendientes documentados (este archivo)
        ↓
Milestone 7 — Device Management
        ↓
Frontend Pairing / Device Management
        ↓
LAN / Multi-device
```

Estos puntos no significan que el Milestone 6 esté incompleto: son decisiones y puntos de
integración que deliberadamente se dejaron para cuando exista la UI y Device Management, en línea
con el principio ya aplicado en este proyecto de no construir abstracciones antes de tener una
necesidad real (ver `apps/backend/src/core/README.md`).
