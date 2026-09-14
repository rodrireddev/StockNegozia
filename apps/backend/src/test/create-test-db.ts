import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import * as schema from "../database/schema";
import type { Database as DrizzleDb } from "../database/database.types";

/**
 * Base SQLite en memoria con las migraciones reales aplicadas — usada por los tests para
 * ejercitar transacciones/consultas contra un motor SQLite de verdad en vez de mocks.
 */
export function createTestDb(): DrizzleDb {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, "../database/migrations") });
  return db;
}
