import RawDatabase from "better-sqlite3";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, openSync, writeSync, closeSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSilentTestLogger } from "../test/create-test-logger";
import { createTestDb } from "../test/create-test-db";
import type { Database } from "../database/database.types";
import { getRawSqliteClient } from "../database/database.types";
import { CategoriesRepository } from "../core/categories/categories.repository";
import { CategoriesService } from "../core/categories/categories.service";
import { ProductsRepository } from "../core/products/products.repository";
import { ProductsService } from "../core/products/products.service";
import { StockMovementsRepository } from "../core/stock-movements/stock-movements.repository";
import { StockMovementsService } from "../core/stock-movements/stock-movements.service";
import { BackupService } from "./backup.service";

/**
 * `BackupService` necesita un archivo real en disco (no `:memory:`) para poder abrirlo de nuevo
 * como candidato — mismo motivo por el que `backup.service.ts` en sí mismo escribe a un archivo.
 */
describe("BackupService", () => {
  let tmpDir: string;
  let db: Database;
  let productsService: ProductsService;
  let service: BackupService;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stocknegozia-backup-test-"));
    db = createTestDb();
    const logger = createSilentTestLogger();
    const categoriesService = new CategoriesService(new CategoriesRepository(db));
    const stockMovementsService = new StockMovementsService(new StockMovementsRepository(db), logger);
    productsService = new ProductsService(db, new ProductsRepository(db), categoriesService, stockMovementsService, logger);
    service = new BackupService(db, logger);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function backupPath(name = "stocknegozia-backup-test.db"): string {
    return path.join(tmpDir, name);
  }

  describe("create", () => {
    it("crea un backup que puede reabrirse y pasa integrity_check", async () => {
      const destination = backupPath();
      const result = await service.create(destination);

      expect(result.fileName).toBe("stocknegozia-backup-test.db");
      expect(result.filePath).toBe(destination);
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(() => new Date(result.createdAt).toISOString()).not.toThrow();

      const reopened = new RawDatabase(destination, { readonly: true, fileMustExist: true });
      try {
        const integrity = reopened.pragma("integrity_check") as { integrity_check: string }[];
        expect(integrity).toEqual([{ integrity_check: "ok" }]);
      } finally {
        reopened.close();
      }
    });

    it("el backup contiene los datos reales de la base al momento de crearlo, no una copia vacía", async () => {
      const product = productsService.create({
        name: "Coca-Cola 500ml",
        sku: "COCA-500",
        purchasePrice: 850,
        salePrice: 1200,
        stock: 10,
        minimumStock: 0,
        active: true,
      });

      const destination = backupPath();
      await service.create(destination);

      const reopened = new RawDatabase(destination, { readonly: true, fileMustExist: true });
      try {
        const row = reopened.prepare("SELECT name, sku, stock FROM products WHERE id = ?").get(product.id) as
          | { name: string; sku: string; stock: number }
          | undefined;
        expect(row).toEqual({ name: "Coca-Cola 500ml", sku: "COCA-500", stock: 10 });
      } finally {
        reopened.close();
      }
    });

    it("crea el directorio de destino si todavía no existe", async () => {
      const destination = path.join(tmpDir, "nested", "backups", "stocknegozia-backup-test.db");
      const result = await service.create(destination);
      expect(result.sizeBytes).toBeGreaterThan(0);
    });

    it("propaga un error amigable si el destino no se puede escribir", async () => {
      // Un archivo existente usado como si fuera un directorio padre nunca puede "existir como
      // carpeta" — fuerza el mismo tipo de fallo de filesystem que una ruta sin permisos.
      const blockingFile = path.join(tmpDir, "not-a-directory");
      writeFileSync(blockingFile, "x");
      const destination = path.join(blockingFile, "stocknegozia-backup-test.db");

      await expect(service.create(destination)).rejects.toThrow(/no se pudo crear el backup/i);
    });
  });

  describe("validate", () => {
    it("acepta un backup válido y compatible, con la cantidad de migraciones aplicadas", async () => {
      const destination = backupPath();
      await service.create(destination);

      const result = service.validate(destination);

      expect(result.status).toBe("valid");
      expect(result.migrationCount).toBeGreaterThan(0);
      expect(result.createdAt).not.toBeNull();
    });

    it("rechaza un archivo que no existe", () => {
      const result = service.validate(backupPath("no-existe.db"));
      expect(result.status).toBe("not_found");
    });

    it("rechaza un archivo que no es SQLite", () => {
      const destination = backupPath("no-es-sqlite.db");
      writeFileSync(destination, "esto es un archivo de texto cualquiera, no una base SQLite");

      const result = service.validate(destination);
      expect(result.status).toBe("not_sqlite");
    });

    it("rechaza un SQLite arbitrario que no tiene las tablas de StockNegozia", () => {
      const destination = backupPath("sqlite-arbitrario.db");
      const arbitrary = new RawDatabase(destination);
      arbitrary.exec("CREATE TABLE otra_cosa (id INTEGER PRIMARY KEY, valor TEXT)");
      arbitrary.close();

      const result = service.validate(destination);
      expect(result.status).toBe("missing_tables");
    });

    it("rechaza un backup corrupto (integrity_check falla) aunque SQLite pueda abrirlo", async () => {
      const destination = backupPath("corrupto.db");
      await service.create(destination);

      // Corrompe contenido de página bien después del header (los primeros bytes deben seguir
      // pareciendo un archivo SQLite válido para que `new Database()` lo abra sin lanzar).
      const fd = openSync(destination, "r+");
      const garbage = Buffer.alloc(200, 0xff);
      writeSync(fd, garbage, 0, garbage.length, 4096);
      closeSync(fd);

      const result = service.validate(destination);
      expect(result.status).toBe("corrupt");
    });

    it("rechaza un backup de una versión anterior (menos migraciones que la instalación actual)", async () => {
      const destination = backupPath("version-anterior.db");
      await service.create(destination);

      // El archivo backupeado hereda `journal_mode = WAL` de la base de origen (es una propiedad
      // persistida en el propio archivo) — se fuerza `DELETE` acá para que la modificación quede
      // directamente en el archivo principal, no en un `-wal` que una conexión de solo lectura
      // aparte todavía no vería.
      //
      // Se borra por `created_at`, no por `id`: el migrator de Drizzle crea `__drizzle_migrations`
      // con `id SERIAL PRIMARY KEY` — sintaxis de Postgres que SQLite no reconoce como
      // autoincrement, así que `id` queda `NULL` en todas las filas (SQLite no lo rechaza, una
      // columna PRIMARY KEY que no es el alias especial `INTEGER PRIMARY KEY` admite NULL). No es
      // un bug de este servicio: `BackupService` ya usa `created_at`, nunca `id`, para exactamente
      // esta razón.
      const raw = new RawDatabase(destination);
      raw.pragma("journal_mode = DELETE");
      raw.exec(
        "DELETE FROM __drizzle_migrations WHERE created_at = (SELECT MAX(created_at) FROM __drizzle_migrations)",
      );
      raw.close();

      const result = service.validate(destination);
      expect(result.status).toBe("incompatible_older");
    });

    it("rechaza un backup de una versión futura (más migraciones que la instalación actual)", async () => {
      const destination = backupPath("version-futura.db");
      await service.create(destination);

      const raw = new RawDatabase(destination);
      raw.pragma("journal_mode = DELETE"); // ver comentario equivalente en el test "versión anterior"
      const future = Date.now() + 1_000_000_000;
      raw.prepare(`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)`).run("fake-future-hash", future);
      raw.close();

      const result = service.validate(destination);
      expect(result.status).toBe("incompatible_newer");
    });

    it("nunca escribe en el archivo candidato al validarlo (conexión de solo lectura)", async () => {
      const destination = backupPath();
      await service.create(destination);
      const before = readFileSync(destination);

      service.validate(destination);

      const after = readFileSync(destination);
      expect(after.equals(before)).toBe(true);
    });
  });

  it("getRawSqliteClient expone la conexión better-sqlite3 real usada por Drizzle", () => {
    const client = getRawSqliteClient(db);
    expect(typeof client.backup).toBe("function");
    expect(typeof client.pragma).toBe("function");
  });
});
