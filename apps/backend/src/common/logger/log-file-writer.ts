import { mkdirSync, appendFileSync } from "node:fs";
import path from "node:path";
import type { LogEntry } from "./log-entry";

/**
 * Persistencia JSONL best-effort. Crea su propio directorio (independiente de
 * ensure-data-dirs.ts/DatabaseModule — el logging no debe depender de que la base de datos de
 * negocio se haya inicializado) y usa `appendFileSync`: esta es una app de escritorio de un solo
 * usuario, no un servidor de alto tráfico, así que un append síncrono es suficiente y evita tener
 * que gestionar el cierre/flush de un stream.
 *
 * Un fallo de escritura NUNCA se propaga ni se vuelve a loguear con este mismo logger (evitaría un
 * loop) — se reporta una sola vez a stderr como último recurso.
 */
export class LogFileWriter {
  private readonly filePath: string;

  constructor(dir: string) {
    this.filePath = path.join(dir, "app.log");
    try {
      mkdirSync(dir, { recursive: true });
      // Reservado para una futura rotación manual/automática — no implementada en este milestone.
      mkdirSync(path.join(dir, "archive"), { recursive: true });
    } catch (error) {
      this.reportFailure(error);
    }
  }

  append(entry: LogEntry): void {
    try {
      appendFileSync(this.filePath, `${JSON.stringify(entry)}\n`, "utf8");
    } catch (error) {
      this.reportFailure(error);
    }
  }

  private reportFailure(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[logger] failed to persist log entry: ${message}\n`);
  }
}
