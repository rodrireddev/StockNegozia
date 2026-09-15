// @vitest-environment node
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildBackupFileName,
  copyDatabaseFiles,
  deleteDatabaseFiles,
  moveDatabaseFiles,
} from "./backup-file-ops";

/**
 * Estas son las operaciones de filesystem más peligrosas de todo el milestone (el swap real de
 * Restore, ver docs/backup/BACKUP_RESTORE.md §Arquitectura de Restore) — se probaron aparte,
 * sin depender de Electron (`app`/`dialog`/`BrowserWindow`), justamente para poder testearlas con
 * archivos reales en disco sin necesitar un proceso Electron real ni tests frágiles.
 */
describe("backup-file-ops", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stocknegozia-backup-fileops-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  function write(name: string, content: string): string {
    const filePath = path.join(tmpDir, name);
    writeFileSync(filePath, content);
    return filePath;
  }

  describe("buildBackupFileName", () => {
    it("sigue el formato stocknegozia-backup-YYYY-MM-DD-HH-mm-ss.db", () => {
      expect(buildBackupFileName()).toMatch(
        /^stocknegozia-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.db$/,
      );
    });

    it("usa el prefijo pre-restore cuando se pide", () => {
      expect(buildBackupFileName("pre-restore")).toMatch(
        /^stocknegozia-pre-restore-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.db$/,
      );
    });
  });

  describe("moveDatabaseFiles", () => {
    it("mueve el archivo principal aunque no existan -wal/-shm", () => {
      const from = write("db.sqlite", "principal");
      const to = path.join(tmpDir, "moved.sqlite");

      moveDatabaseFiles(from, to);

      expect(existsSync(from)).toBe(false);
      expect(readFileSync(to, "utf-8")).toBe("principal");
    });

    it("mueve también -wal y -shm cuando existen", () => {
      const from = write("db.sqlite", "principal");
      write("db.sqlite-wal", "wal");
      write("db.sqlite-shm", "shm");
      const to = path.join(tmpDir, "moved.sqlite");

      moveDatabaseFiles(from, to);

      expect(readFileSync(`${to}-wal`, "utf-8")).toBe("wal");
      expect(readFileSync(`${to}-shm`, "utf-8")).toBe("shm");
      expect(existsSync(`${from}-wal`)).toBe(false);
      expect(existsSync(`${from}-shm`)).toBe(false);
    });

    it("no lanza si el archivo principal no existe (base ya vacía)", () => {
      const from = path.join(tmpDir, "no-existe.sqlite");
      const to = path.join(tmpDir, "moved.sqlite");
      expect(() => moveDatabaseFiles(from, to)).not.toThrow();
      expect(existsSync(to)).toBe(false);
    });
  });

  describe("copyDatabaseFiles", () => {
    it("copia el archivo principal conservando el original", () => {
      const from = write("db.sqlite", "principal");
      const to = path.join(tmpDir, "copy.sqlite");

      copyDatabaseFiles(from, to);

      expect(readFileSync(to, "utf-8")).toBe("principal");
      expect(existsSync(from)).toBe(true); // a diferencia de move, el original sigue estando
    });

    it("copia -wal/-shm cuando el candidato los tiene", () => {
      const from = write("db.sqlite", "principal");
      write("db.sqlite-wal", "wal");
      const to = path.join(tmpDir, "copy.sqlite");

      copyDatabaseFiles(from, to);

      expect(readFileSync(`${to}-wal`, "utf-8")).toBe("wal");
      expect(existsSync(`${to}-shm`)).toBe(false); // no inventa un -shm que no existía
    });
  });

  describe("deleteDatabaseFiles", () => {
    it("borra el archivo principal y sus sidecars cuando existen", () => {
      const base = write("db.sqlite", "principal");
      write("db.sqlite-wal", "wal");
      write("db.sqlite-shm", "shm");

      deleteDatabaseFiles(base);

      expect(existsSync(base)).toBe(false);
      expect(existsSync(`${base}-wal`)).toBe(false);
      expect(existsSync(`${base}-shm`)).toBe(false);
    });

    it("no lanza si no hay nada que borrar", () => {
      expect(() => deleteDatabaseFiles(path.join(tmpDir, "nada.sqlite"))).not.toThrow();
    });
  });

  it("swap y rollback: el contenido original es recuperable después de un swap deshecho", () => {
    // Simula exactamente la secuencia de restoreSelectedFile()/rollback() de BackupManager, sin
    // Electron: live → swap-backup, candidato → live, y ante un fallo, deshacer.
    const live = write("stocknegozia.sqlite", "datos originales");
    const candidate = write("candidato.sqlite", "datos del backup a restaurar");
    const swapAside = path.join(tmpDir, "stocknegozia.sqlite.swap-backup");

    moveDatabaseFiles(live, swapAside);
    copyDatabaseFiles(candidate, live);
    expect(readFileSync(live, "utf-8")).toBe("datos del backup a restaurar");

    // Algo falla después del swap — rollback:
    deleteDatabaseFiles(live);
    moveDatabaseFiles(swapAside, live);

    expect(readFileSync(live, "utf-8")).toBe("datos originales");
    expect(existsSync(swapAside)).toBe(false);
  });
});
