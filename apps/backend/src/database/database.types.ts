import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "./schema";

export type Database = BetterSQLite3Database<typeof schema>;

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
