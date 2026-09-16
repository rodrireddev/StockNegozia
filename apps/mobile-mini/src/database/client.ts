import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

const DATABASE_NAME = "stocknegozia-mini.db";

const sqlite = openDatabaseSync(DATABASE_NAME);
// SQLite no valida foreign keys por defecto — a partir de Sales/Purchases (sale_items → sales,
// stock_movements → sales/purchases) las FKs declaradas en el schema deben aplicarse de verdad,
// mismo criterio que `apps/backend/src/database/database.module.ts`.
sqlite.execSync("PRAGMA journal_mode = WAL;");
sqlite.execSync("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });
