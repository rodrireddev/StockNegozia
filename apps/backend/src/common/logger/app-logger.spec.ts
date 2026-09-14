import { mkdtempSync, readFileSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppLogger } from "./app-logger.service";
import type { LogEntry } from "./log-entry";

function readEntries(dir: string): LogEntry[] {
  const filePath = path.join(dir, "app.log");
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as LogEntry);
}

describe("AppLogger", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-logger-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("escribe cada evento como una línea JSONL", () => {
    const logger = new AppLogger({ level: "debug", dir, persistence: true, console: false });
    logger.info({ context: "Test", event: "test.one", message: "uno" });
    logger.info({ context: "Test", event: "test.two", message: "dos" });

    const entries = readEntries(dir);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.event).toBe("test.one");
    expect(entries[1]!.event).toBe("test.two");
  });

  it("conserva metadata, context, operation y event", () => {
    const logger = new AppLogger({ level: "debug", dir, persistence: true, console: false });
    logger.warn({
      context: "ProductsService",
      operation: "adjustStock",
      event: "stock.insufficient",
      message: "no hay stock",
      metadata: { productId: 5, requested: 3, available: 1 },
    });

    const [entry] = readEntries(dir);
    expect(entry!.context).toBe("ProductsService");
    expect(entry!.operation).toBe("adjustStock");
    expect(entry!.event).toBe("stock.insufficient");
    expect(entry!.metadata).toEqual({ productId: 5, requested: 3, available: 1 });
    expect(entry!.level).toBe("WARN");
    expect(typeof entry!.timestamp).toBe("string");
  });

  it("adjunta el error normalizado cuando se provee", () => {
    const logger = new AppLogger({ level: "debug", dir, persistence: true, console: false });
    logger.error({
      context: "SalesService",
      event: "sale.create.failed",
      message: "falló",
      error: new Error("boom"),
    });

    const [entry] = readEntries(dir);
    expect(entry!.error?.name).toBe("Error");
    expect(entry!.error?.message).toBe("boom");
    expect(entry!.error?.stack).toContain("boom");
  });

  it("respeta LOG_LEVEL: no escribe niveles por debajo del umbral configurado", () => {
    const logger = new AppLogger({ level: "warn", dir, persistence: true, console: false });
    logger.debug({ context: "Test", event: "test.debug", message: "no debería aparecer" });
    logger.info({ context: "Test", event: "test.info", message: "no debería aparecer" });
    logger.warn({ context: "Test", event: "test.warn", message: "sí debería aparecer" });

    const entries = readEntries(dir);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.event).toBe("test.warn");
  });

  it("puede desactivar la persistencia sin fallar", () => {
    const logger = new AppLogger({ level: "debug", dir, persistence: false, console: false });
    expect(() =>
      logger.info({ context: "Test", event: "test.no-persist", message: "no se guarda" }),
    ).not.toThrow();
    expect(existsSync(path.join(dir, "app.log"))).toBe(false);
  });

  it("respeta LOG_DIR: los logs aparecen en el directorio configurado", () => {
    const customDir = mkdtempSync(path.join(tmpdir(), "stocknegozia-logger-custom-"));
    try {
      const logger = new AppLogger({
        level: "debug",
        dir: customDir,
        persistence: true,
        console: false,
      });
      logger.info({ context: "Test", event: "test.custom-dir", message: "acá" });
      expect(existsSync(path.join(customDir, "app.log"))).toBe(true);
    } finally {
      rmSync(customDir, { recursive: true, force: true });
    }
  });

  it("un error real de I/O al escribir no rompe la operación de negocio ni recursa", () => {
    // Apuntamos "dir" a un archivo regular (no un directorio): mkdirSync/appendFileSync fallan
    // de verdad, ejercitando el try/catch real de LogFileWriter en vez de simularlo.
    const notADirectory = path.join(dir, "this-is-a-file.txt");
    writeFileSync(notADirectory, "soy un archivo, no un directorio");

    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const logger = new AppLogger({
      level: "debug",
      dir: notADirectory,
      persistence: true,
      console: false,
    });

    expect(() =>
      logger.info({ context: "Test", event: "test.write-failure", message: "no debería tirar" }),
    ).not.toThrow();

    // El fallo se reporta a stderr una vez por escritura fallida — nunca a través del logger
    // mismo (eso sería un loop de logging).
    expect(stderrSpy).toHaveBeenCalled();
    for (const call of stderrSpy.mock.calls) {
      expect(String(call[0])).not.toContain('"event"'); // no es una entrada JSONL del propio logger
    }

    stderrSpy.mockRestore();
  });
});
