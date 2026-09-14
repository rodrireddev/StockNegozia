import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LogEntry } from "./log-entry";
import { LogReader } from "./log-reader";

function writeLine(filePath: string, entry: Partial<LogEntry> | string): void {
  const line = typeof entry === "string" ? entry : JSON.stringify(entry);
  appendFileSync(filePath, `${line}\n`, "utf8");
}

describe("LogReader", () => {
  let dir: string;
  let filePath: string;
  let reader: LogReader;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-logreader-"));
    filePath = path.join(dir, "app.log");
    reader = new LogReader(filePath);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("devuelve un array vacío si el archivo todavía no existe", async () => {
    await expect(reader.readAll()).resolves.toEqual([]);
  });

  it("lee todos los eventos en orden cronológico (orden del archivo)", async () => {
    writeLine(filePath, {
      timestamp: "2026-01-01T00:00:00.000Z",
      level: "INFO",
      context: "A",
      event: "one",
      message: "1",
    });
    writeLine(filePath, {
      timestamp: "2026-01-01T00:00:01.000Z",
      level: "INFO",
      context: "A",
      event: "two",
      message: "2",
    });
    writeLine(filePath, {
      timestamp: "2026-01-01T00:00:02.000Z",
      level: "INFO",
      context: "A",
      event: "three",
      message: "3",
    });

    const entries = await reader.readAll();
    expect(entries.map((e) => e.event)).toEqual(["one", "two", "three"]);
  });

  it("busca por requestId y devuelve solo las entradas de ese request", async () => {
    writeLine(filePath, {
      timestamp: "t1",
      level: "INFO",
      context: "HTTP",
      event: "http.request.started",
      message: "m",
      requestId: "req-1",
    });
    writeLine(filePath, {
      timestamp: "t2",
      level: "INFO",
      context: "SalesService",
      event: "sale.create.started",
      message: "m",
      requestId: "req-1",
    });
    writeLine(filePath, {
      timestamp: "t3",
      level: "INFO",
      context: "HTTP",
      event: "http.request.started",
      message: "m",
      requestId: "req-2",
    });

    const entries = await reader.findByRequestId("req-1");
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.requestId === "req-1")).toBe(true);
  });

  it("busca por event", async () => {
    writeLine(filePath, {
      timestamp: "t1",
      level: "WARN",
      context: "ProductsService",
      event: "stock.insufficient",
      message: "m",
    });
    writeLine(filePath, {
      timestamp: "t2",
      level: "INFO",
      context: "SalesService",
      event: "sale.create.started",
      message: "m",
    });

    const entries = await reader.findByEvent("stock.insufficient");
    expect(entries).toHaveLength(1);
    expect(entries[0]!.event).toBe("stock.insufficient");
  });

  it("busca por level", async () => {
    writeLine(filePath, {
      timestamp: "t1",
      level: "ERROR",
      context: "A",
      event: "e1",
      message: "m",
    });
    writeLine(filePath, {
      timestamp: "t2",
      level: "INFO",
      context: "A",
      event: "e2",
      message: "m",
    });
    writeLine(filePath, {
      timestamp: "t3",
      level: "ERROR",
      context: "A",
      event: "e3",
      message: "m",
    });

    const entries = await reader.findByLevel("ERROR");
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.level === "ERROR")).toBe(true);
  });

  it("filtra por rango temporal (from/to)", async () => {
    writeLine(filePath, {
      timestamp: "2026-01-01T00:00:00.000Z",
      level: "INFO",
      context: "A",
      event: "e1",
      message: "m",
    });
    writeLine(filePath, {
      timestamp: "2026-01-02T00:00:00.000Z",
      level: "INFO",
      context: "A",
      event: "e2",
      message: "m",
    });
    writeLine(filePath, {
      timestamp: "2026-01-03T00:00:00.000Z",
      level: "INFO",
      context: "A",
      event: "e3",
      message: "m",
    });

    const entries = await reader.query({
      from: new Date("2026-01-01T12:00:00.000Z"),
      to: new Date("2026-01-02T12:00:00.000Z"),
    });
    expect(entries.map((e) => e.event)).toEqual(["e2"]);
  });

  it("ignora líneas corruptas sin romper la lectura del resto del archivo", async () => {
    writeLine(filePath, {
      timestamp: "t1",
      level: "INFO",
      context: "A",
      event: "e1",
      message: "m",
    });
    writeLine(filePath, "esto no es JSON válido {{{");
    writeLine(filePath, {
      timestamp: "t2",
      level: "INFO",
      context: "A",
      event: "e2",
      message: "m",
    });

    const entries = await reader.readAll();
    expect(entries.map((e) => e.event)).toEqual(["e1", "e2"]);
  });
});
