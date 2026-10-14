import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  backupBeforeMigrations,
  countPendingMigrations,
  PRE_UPDATE_BACKUPS_TO_KEEP,
} from "./pre-migration-backup";

const migrationsFolder = path.join(__dirname, "migrations");

/** Simula una base de una versión anterior: le "des-aplica" las últimas `count` migraciones. */
function forgetLastMigrations(sqlite: Database.Database, count: number): void {
  sqlite
    .prepare(
      // `id` es `SERIAL` (en SQLite queda NULL): se identifica cada migración por `created_at`.
      "DELETE FROM __drizzle_migrations WHERE created_at IN (SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT ?)",
    )
    .run(count);
}

describe("backupBeforeMigrations", () => {
  let dir: string;
  let sqlite: Database.Database;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "sn-pre-update-"));
    sqlite = new Database(path.join(dir, "stocknegozia.sqlite"));
  });

  afterEach(() => {
    sqlite.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const backupsDir = () => path.join(dir, "backups", "pre-update");

  it("no respalda una base nueva (sin migraciones aplicadas)", () => {
    expect(countPendingMigrations(sqlite, migrationsFolder)).toBe(0);
    expect(backupBeforeMigrations(sqlite, { migrationsFolder, backupsDir: backupsDir() })).toBeNull();
    expect(existsSync(backupsDir())).toBe(false);
  });

  it("no respalda una base que ya está al día", () => {
    migrate(drizzle(sqlite), { migrationsFolder });
    expect(backupBeforeMigrations(sqlite, { migrationsFolder, backupsDir: backupsDir() })).toBeNull();
  });

  it("respalda los datos antes de migrar una base de una versión anterior", () => {
    migrate(drizzle(sqlite), { migrationsFolder });
    sqlite
      .prepare("INSERT INTO sales (status, total, created_at) VALUES ('completed', 1500, ?)")
      .run(Math.floor(Date.now() / 1000));
    forgetLastMigrations(sqlite, 1);

    expect(countPendingMigrations(sqlite, migrationsFolder)).toBe(1);
    const backup = backupBeforeMigrations(sqlite, { migrationsFolder, backupsDir: backupsDir() });

    expect(backup).not.toBeNull();
    const copy = new Database(backup!, { readonly: true });
    expect(copy.prepare("SELECT total FROM sales").all()).toEqual([{ total: 1500 }]);
    copy.close();
  });

  it(`conserva sólo los últimos ${PRE_UPDATE_BACKUPS_TO_KEEP} respaldos`, () => {
    migrate(drizzle(sqlite), { migrationsFolder });
    forgetLastMigrations(sqlite, 1);

    for (let i = 0; i < PRE_UPDATE_BACKUPS_TO_KEEP + 2; i++) {
      backupBeforeMigrations(sqlite, {
        migrationsFolder,
        backupsDir: backupsDir(),
        now: new Date(2026, 0, 1, 10, 0, i),
      });
    }

    const files = readdirSync(backupsDir()).sort();
    expect(files).toHaveLength(PRE_UPDATE_BACKUPS_TO_KEEP);
    expect(files[0]).toBe("stocknegozia-pre-update-2026-01-01-10-00-02.db");
  });
});

describe("migración 0019: ventas anteriores a los medios de pago", () => {
  it("asigna un pago 'Otro' por el total a las ventas sin pagos y no toca las que ya tienen", () => {
    const sqlite = new Database(":memory:");
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder });
    const now = Math.floor(Date.now() / 1000);
    const insertSale = sqlite.prepare(
      "INSERT INTO sales (status, total, created_at) VALUES (?, ?, ?)",
    );
    const legacy = Number(insertSale.run("completed", 2500, now).lastInsertRowid);
    const legacyCancelled = Number(insertSale.run("cancelled", 300, now).lastInsertRowid);
    const withPayment = Number(insertSale.run("completed", 1000, now).lastInsertRowid);
    sqlite
      .prepare("INSERT INTO sale_payments (sale_id, method, amount) VALUES (?, 'cash', 1000)")
      .run(withPayment);

    // Base "vieja": la 0019 todavía no corrió — al actualizar se aplica sobre esos datos.
    forgetLastMigrations(sqlite, 1);
    migrate(db, { migrationsFolder });

    const payments = sqlite
      .prepare("SELECT sale_id, method, amount FROM sale_payments ORDER BY sale_id")
      .all();
    expect(payments).toEqual([
      { sale_id: legacy, method: "other", amount: 2500 },
      { sale_id: legacyCancelled, method: "other", amount: 300 },
      { sale_id: withPayment, method: "cash", amount: 1000 },
    ]);
    sqlite.close();
  });
});
