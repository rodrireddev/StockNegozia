import type BetterSqlite3Ctor from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "./schema";

export type Database = BetterSQLite3Database<typeof schema>;

/** Instancia real de `better-sqlite3` (lo que devuelve `new Database(...)`), no el constructor. */
export type RawSqliteConnection = InstanceType<typeof BetterSqlite3Ctor>;

/**
 * Drizzle envuelve la conexión `better-sqlite3` real; `drizzle()` la expone en `$client` (ver
 * drizzle-orm/better-sqlite3/driver), pero el tipo `Database` compartido (arriba) no lo declara
 * porque ningún repositorio necesita la conexión cruda — solo `BackupService`, que sí necesita el
 * método nativo `.backup()` (SQLite Online Backup API) para generar un snapshot consistente sin
 * detener la aplicación, ver docs/backup/BACKUP_RESTORE.md §Estrategia SQLite.
 */
export function getRawSqliteClient(db: Database): RawSqliteConnection {
  return (db as unknown as { $client: RawSqliteConnection }).$client;
}

/** El "tx" que recibe el callback de `db.transaction(tx => ...)`. */
export type DrizzleTransaction = Parameters<Database["transaction"]>[0] extends (
  tx: infer T,
) => unknown
  ? T
  : never;

/**
 * Executor de queries: la conexión global o una transacción en curso. Los repositorios lo
 * aceptan como parámetro opcional para poder participar en una transacción iniciada por un
 * service (ver SalesService), sin necesitar dos implementaciones distintas de cada query.
 */
export type DrizzleExecutor = Database | DrizzleTransaction;
