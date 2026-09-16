import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import type * as schema from "./schema";

/** Mismo patrón que `apps/backend/src/database/database.types.ts`, sobre el driver de expo-sqlite
 *  en vez de better-sqlite3 — acá no hay servidor, así que la "conexión global" vive en el propio
 *  proceso de la app. */
export type Database = ExpoSQLiteDatabase<typeof schema>;

/** El "tx" que recibe el callback de `db.transaction(tx => ...)`. */
export type DrizzleTransaction = Parameters<Database["transaction"]>[0] extends (
  tx: infer T,
) => unknown
  ? T
  : never;

/**
 * Executor de queries: la conexión global o una transacción en curso. Los repositorios lo aceptan
 * como parámetro opcional para poder participar en una transacción iniciada por un service (ver
 * salesService.create), sin necesitar dos implementaciones distintas de cada query — mismo
 * criterio que el backend.
 */
export type DrizzleExecutor = Database | DrizzleTransaction;
