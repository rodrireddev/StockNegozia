import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

/** El "tx" que recibe el callback de `db.transaction(tx => ...)`. */
export type DrizzleTransaction = Parameters<Database["transaction"]>[0] extends (
  tx: infer T,
) => unknown
  ? T
  : never;

/**
 * Executor de queries: la conexión global o una transacción en curso. Los repositorios lo aceptan
 * como parámetro opcional para poder participar en una transacción iniciada por un service, sin
 * necesitar dos implementaciones distintas de cada query (mismo patrón que apps/backend).
 */
export type DrizzleExecutor = Database | DrizzleTransaction;
