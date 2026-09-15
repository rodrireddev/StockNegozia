# Backup & Restore

## Dónde vive la base de datos

`<dataDir>/database/stocknegozia.sqlite` — el mismo `dataDir` que ya usan logs/config/plugins (ver
`apps/backend/src/config/configuration.ts`). En Electron, `dataDir = app.getPath('userData')`
(ej. `%APPDATA%\StockNegozia` en Windows); si el backend corre standalone, cae a `./data` relativo
al cwd.

SQLite corre en **WAL** (`journal_mode = WAL`, ver `database.module.ts`), así que junto al `.sqlite`
pueden existir `stocknegozia.sqlite-wal` y `stocknegozia.sqlite-shm` mientras la app está en uso —
copiar solamente el archivo principal con el WAL activo puede perder transacciones confirmadas que
todavía no se volcaron al archivo. Esto es exactamente lo que resuelve la estrategia de backup de
abajo.

## Arquitectura de Backup

```
Renderer                    Electron Main                      Backend
   │                              │                                │
   │  window.backup.create()      │                                │
   ├─────────────────────────────►│                                │
   │                              │  dialog.showSaveDialog()        │
   │                              │  (elige ruta — el Renderer      │
   │                              │   nunca la ve)                  │
   │                              │                                │
   │                              │  POST /backup                  │
   │                              │  { destinationPath }            │
   │                              ├───────────────────────────────►│
   │                              │                                │  db.$client.backup(path)
   │                              │                                │  (SQLite Online Backup API,
   │                              │                                │   sin detener nada)
   │                              │◄───────────────────────────────┤
   │◄─────────────────────────────┤  BackupResultDto                │
   │  { fileName, sizeBytes, … }  │                                │
```

El backend es el único proceso que crea o valida un backup — es quien tiene la conexión SQLite
abierta. Electron Main solo coordina: diálogos nativos y la llamada HTTP con la ruta que el
usuario eligió. El Renderer dispara la acción y recibe un resultado ya resuelto; nunca ve ni envía
una ruta de archivo.

## Estrategia SQLite

Se usa `Database.prototype.backup()` de `better-sqlite3` (SQLite Online Backup API,
`sqlite3_backup_init`), no una copia binaria del archivo. Esta API:

- Toma un snapshot lógicamente consistente de todas las páginas, sea cual sea el `journal_mode`.
- No requiere detener la aplicación ni bloquear otras conexiones.
- No requiere cambiar `journal_mode` ni hacer un checkpoint manual — la API ya maneja el WAL
  correctamente por dentro.

`BackupService.create()` (`apps/backend/src/backup/backup.service.ts`) accede a la conexión real a
través de `db.$client` (`getRawSqliteClient()`, `apps/backend/src/database/database.types.ts`) —
Drizzle envuelve `better-sqlite3` pero expone el cliente crudo justamente para casos como este.
Después de crear el archivo, se reabre y se corre la misma validación que se le exige a cualquier
backup (ver abajo) antes de darlo por exitoso — nunca se confía ciegamente en que `.backup()` no
lanzó una excepción.

## Formato del archivo

`stocknegozia-backup-YYYY-MM-DD-HH-mm-ss.db` (o `stocknegozia-pre-restore-...` para el backup de
seguridad automático) — generado por `buildBackupFileName()` en
`apps/desktop/electron/main/backup-manager.ts`. El nombre por defecto se ofrece en el diálogo de
guardado; el usuario puede cambiarlo libremente (la validación nunca depende del nombre del
archivo, solo de su contenido).

## Validación

`BackupService.validate()` — nunca escribe en el archivo candidato (conexión `readonly: true`).
Chequeos, en este orden (falla rápido en el primero que no pasa):

1. **El archivo existe** (`fs.existsSync`) → si no, `not_found`.
2. **Puede abrirse como SQLite** — `new Database(path, { readonly: true, fileMustExist: true })`.
   SQLite abre de forma perezosa: un archivo que no es una base de datos recién lanza al primer
   acceso real (`PRAGMA`/query), no en el constructor — por eso este chequeo está fusionado con el
   siguiente paso en el código.
3. **No está corrupto** — `PRAGMA integrity_check` debe devolver exactamente `[{ integrity_check:
   "ok" }]`. Cualquier otro resultado, o una excepción en este paso (ej. "database disk image is
   malformed"), es `corrupt`. Un error de "file is not a database" en este mismo paso es
   `not_sqlite` (no es un archivo SQLite en absoluto — se distingue por el mensaje exacto que
   emite SQLite).
4. **Tiene las tablas esenciales** — un subconjunto curado de tablas de negocio (`products`,
   `categories`, `suppliers`, `purchases`, `purchase_items`, `sales`, `sale_items`,
   `stock_movements`) más `__drizzle_migrations`. Si falta alguna, `missing_tables` — un SQLite
   arbitrario nunca las va a tener todas.
5. **Compatibilidad de schema** — ver sección propia abajo.

Solo si los 5 pasos pasan, el resultado es `valid`.

## Compatibilidad de schema

**No se inventó un sistema de versionado propio.** Drizzle ya mantiene una tabla
`__drizzle_migrations` (`id, hash, created_at`) dentro de cada base de datos, poblada
automáticamente al migrar (ver `drizzle-orm/sqlite-core/dialect.ts`). Se reutiliza tal cual:

- `migrationCount` = `COUNT(*)` en esa tabla del candidato.
- `latestMigrationWhen` = `MAX(created_at)` del candidato, comparado contra el `when` de la última
  entrada de `apps/backend/src/database/migrations/meta/_journal.json` (el mismo archivo que
  `drizzle-kit` genera y que el backend ya usa para saber qué migrar).

| Comparación | Resultado |
| --- | --- |
| Backup = instalación actual | `valid` — se puede restaurar. |
| Backup con menos migraciones (versión anterior) | `incompatible_older` — **rechazado**, no se intenta migrar automáticamente. |
| Backup con más migraciones (versión futura) | `incompatible_newer` — **rechazado siempre**, nunca se abre "silenciosamente". |

**Por qué se rechaza en vez de migrar un backup antiguo automáticamente**: migrar un backup como
parte de un restore es una operación de escritura sobre datos que todavía no se terminó de
validar como restaurables, ejecutada bajo presión de tiempo (el usuario está esperando el
resultado) y sin la posibilidad real de probar de antemano todas las combinaciones de versión
anterior × versión actual. El costo de esa complejidad y riesgo no se justifica todavía para el
primer cliente. Si en el futuro hace falta soportarlo, la política a definir sería explícita
("migrar antes de restaurar", con su propio flujo de confirmación) — no una migración silenciosa
dentro del restore actual.

**Nota técnica**: `id` en `__drizzle_migrations` no sirve para "encontrar la última fila" — el
migrator de Drizzle crea la tabla con `id SERIAL PRIMARY KEY` (sintaxis de Postgres que SQLite no
interpreta como autoincrement), así que `id` queda `NULL` en todas las filas. La comparación
siempre debe hacerse por `created_at`, nunca por `id` — ver el comentario en
`backup.service.spec.ts` sobre este punto, descubierto mientras se escribían los tests.

## Arquitectura de Restore

Restore nunca pasa por un endpoint HTTP para el paso de reemplazo de archivo — durante ese paso el
backend está detenido, no hay ningún servidor escuchando. Toda la orquestación vive en
`apps/desktop/electron/main/backup-manager.ts` (`BackupManager.restoreSelectedFile()`), reutilizando
`BackendManager.stop()/start()/waitUntilHealthy()` ya existentes:

```
validate (de nuevo, por las dudas)
      │
      ▼
backup de seguridad de la DB actual (POST /backup — backend todavía corriendo)
      │  (si falla, se aborta acá — nunca se restaura sin red de seguridad)
      ▼
backendManager.stop()  (espera confirmación real de que el proceso salió)
      │  (si no hay confirmación, se aborta — nunca se toca el archivo sin certeza)
      ▼
mover stocknegozia.sqlite(+wal+shm) → stocknegozia.sqlite.swap-backup(+wal+shm)
      │
      ▼
copiar el candidato validado → stocknegozia.sqlite(+wal+shm si el candidato los tiene)
      │
      ▼
backendManager.start() + waitUntilHealthy()
      │
      ├── éxito → borrar los .swap-backup temporales, listo
      │
      └── falla → ROLLBACK:
            borrar el archivo nuevo, mover .swap-backup de vuelta,
            start() + waitUntilHealthy() de nuevo para confirmar el rollback
```

`BackendManager.stop()` se extendió (compatible hacia atrás) para devolver `Promise<boolean>`
— `true` si el proceso hijo confirmó su salida, `false` si se cumplió un timeout de 10s sin
confirmación. El restore aborta si es `false`: nunca reemplaza el archivo sin la certeza de que el
proceso anterior ya no lo tiene abierto. Los llamadores que no necesitan esperar (ej.
`before-quit`) siguen llamando `stop()` sin `await`, sin cambio de comportamiento.

El backup de seguridad pre-restore se guarda en `<dataDir>/backups/` (carpeta nueva, paralela a
`database/`/`config/`/`logs/`/`plugins/`) — **se conserva siempre**, incluso si el restore falla
después de creado, precisamente para eso existe.

## Qué pasa si el restore falla

- Si falla **antes** de tocar el archivo (validación, backup de seguridad, o el backend no se pudo
  detener con certeza): la base de datos actual nunca se tocó. Mensaje: "No se pudo completar la
  restauración. Los datos anteriores se conservaron."
- Si falla **después** de mover el archivo original a `.swap-backup` (falla la copia, o el backend
  no vuelve a responder `/health` con el archivo nuevo): rollback automático — se borra el intento
  fallido y se restaura el archivo original desde `.swap-backup`, y se vuelve a arrancar el backend
  para confirmar que la app quedó operativa de nuevo.
- El backup de seguridad (`stocknegozia-pre-restore-*.db` en `backups/`) sobrevive siempre a un
  restore fallido — no depende de ningún paso posterior.

## Doble protección contra un restore accidental

1. Seleccionar un archivo solo lo **valida** — no reemplaza nada todavía.
2. El diálogo de confirmación muestra fecha, archivo, versión y estado, más una advertencia
   explícita antes de dos botones semánticamente claros: "Cancelar" / "Restaurar backup" (nunca un
   "Aceptar" genérico).
3. Un backup que no pasó la validación **nunca** ofrece el botón de restaurar — ni siquiera se
   muestra la opción.

## Auditoría

`AppLogger` registra (JSONL, mismo `app.log` de siempre — ver `docs/logging/`):
`backup.started/completed/failed`, `restore.validation_started/completed/failed`. La orquestación
completa del restore (parar/mover/copiar/arrancar) vive en Electron Main, fuera del alcance de
`AppLogger` (que es del proceso backend) — el detalle de cada paso queda en la consola del proceso
main (heredada por `stdio: "inherit"`, ver `backend-manager.ts`), no en `app.log`.

Un restore **nunca** crea filas en `stock_movements` — reemplaza el archivo completo de la base de
datos, no ejecuta ninguna operación de negocio.

## Seguridad — por qué el Renderer nunca toca el filesystem

- `contextIsolation: true`, `nodeIntegration: false` (sin cambios, ya eran así).
- El preload (`apps/desktop/electron/preload/index.ts`) expone únicamente
  `window.backup.{create, selectAndValidate, restore}` — ningún método recibe ni devuelve una ruta
  de archivo completa. Comparar con lo que **no** se expone: nada equivalente a
  `window.fs.readFile`/`copyFile`.
- Los tres métodos son `ipcRenderer.invoke(...)` sin argumentos — toda decisión de "qué archivo"
  la toma Electron Main a través de sus propios diálogos nativos (`showSaveDialog`/
  `showOpenDialog`), nunca un valor que venga del Renderer.
- Los endpoints del backend (`POST /backup`, `POST /backup/validate`) están detrás de
  `AdminDeviceGuard` — mismo criterio que `/auth/devices`. Solo Electron Main los llama, con la
  credential del dispositivo ya almacenada (`DeviceCredentialStore`).

## Qué NO protege este sistema todavía

- **Dispositivos/pairing tras un restore**: la tabla `devices` se reemplaza junto con el resto del
  archivo. Si el backup restaurado es de un momento anterior a que el dispositivo actual se
  emparejara, y la instalación corre en `API_ACCESS_MODE=production`, ese dispositivo puede quedar
  sin credential válida contra la base restaurada — requeriría un nuevo bootstrap/pairing. No se
  intenta "reinyectar" el dispositivo actual automáticamente: eso violaría la idea de que un
  restore reemplaza el estado completo, no una mezcla selectiva.
- **Backups creados fuera de la UI** (copiados a mano mientras la app corría, sin pasar por la
  Online Backup API): la validación los acepta si pasan `integrity_check` y tienen las tablas
  esperadas, pero no hay forma de saber si esa copia manual perdió transacciones que solo estaban
  en el WAL al momento de copiarla. Es responsabilidad del usuario que ese archivo se haya
  generado de forma consistente.
- **Backups automáticos/programados**: no existen — este milestone es 100% manual, a propósito
  (ver Parte 32 de la especificación).
- **Cifrado**: los archivos `.db` de backup no están cifrados — cualquiera con acceso al
  filesystem puede abrirlos con cualquier cliente SQLite.
- **Nube/sincronización/versionado de backups**: no implementado — el usuario es responsable de
  dónde guarda sus backups y de no perderlos.
- **Rollback del rollback**: si el propio proceso de rollback (mover `.swap-backup` de vuelta) no
  logra levantar el backend, no hay un segundo nivel automático de recuperación — en ese caso los
  archivos `.swap-backup` siguen en disco junto a `database/` y permitirían una recuperación
  manual, pero eso no está automatizado.
