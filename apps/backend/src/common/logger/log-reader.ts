import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import type { LogEntry, LogLevel } from "./log-entry";

export interface LogQuery {
  requestId?: string;
  event?: string;
  level?: LogLevel;
  from?: Date;
  to?: Date;
}

/**
 * Lee el archivo JSONL línea por línea (streaming, sin cargar todo el archivo en memoria) para
 * poder trabajar con archivos de logs grandes. Las líneas que no puedan parsearse como JSON se
 * saltean silenciosamente — un log corrupto no debe impedir leer el resto del archivo.
 */
export class LogReader {
  constructor(private readonly filePath: string) {}

  async query(filter: LogQuery = {}): Promise<LogEntry[]> {
    if (!existsSync(this.filePath)) return [];

    const results: LogEntry[] = [];
    const rl = createInterface({
      input: createReadStream(this.filePath, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;

      let entry: LogEntry;
      try {
        entry = JSON.parse(line) as LogEntry;
      } catch {
        continue;
      }

      if (filter.requestId && entry.requestId !== filter.requestId) continue;
      if (filter.event && entry.event !== filter.event) continue;
      if (filter.level && entry.level !== filter.level) continue;
      if (filter.from && entry.timestamp < filter.from.toISOString()) continue;
      if (filter.to && entry.timestamp > filter.to.toISOString()) continue;

      results.push(entry);
    }

    return results;
  }

  readAll(): Promise<LogEntry[]> {
    return this.query();
  }

  findByRequestId(requestId: string): Promise<LogEntry[]> {
    return this.query({ requestId });
  }

  findByEvent(event: string): Promise<LogEntry[]> {
    return this.query({ event });
  }

  findByLevel(level: LogLevel): Promise<LogEntry[]> {
    return this.query({ level });
  }
}
