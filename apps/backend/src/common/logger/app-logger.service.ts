import { Logger as NestLogger } from "@nestjs/common";
import { normalizeError } from "./error-utils";
import { LogFileWriter } from "./log-file-writer";
import type { LogEntry, LogLevel } from "./log-entry";
import { isLevelEnabled, toLogLevel } from "./log-levels";
import { RequestContext } from "./request-context";

export interface AppLoggerOptions {
  level: "debug" | "info" | "warn" | "error";
  dir: string;
  persistence: boolean;
  console: boolean;
}

export interface LogFields {
  context: string;
  operation?: string;
  event: string;
  message: string;
  metadata?: Record<string, unknown>;
  error?: unknown;
}

/**
 * Logger centralizado: usa `@nestjs/common`'s `Logger` para la salida de consola (formato nativo
 * de Nest) y persiste cada entrada como una línea JSONL en `LOG_DIR/app.log` (best-effort — un
 * fallo de escritura nunca rompe la operación de negocio, ver LogFileWriter).
 */
export class AppLogger {
  private readonly threshold: LogLevel;
  private readonly fileWriter: LogFileWriter | null;
  private readonly consoleEnabled: boolean;

  constructor(options: AppLoggerOptions) {
    this.threshold = toLogLevel(options.level);
    this.fileWriter = options.persistence ? new LogFileWriter(options.dir) : null;
    this.consoleEnabled = options.console;
  }

  debug(fields: LogFields): void {
    this.write("DEBUG", fields);
  }

  info(fields: LogFields): void {
    this.write("INFO", fields);
  }

  warn(fields: LogFields): void {
    this.write("WARN", fields);
  }

  error(fields: LogFields): void {
    this.write("ERROR", fields);
  }

  private write(level: LogLevel, fields: LogFields): void {
    if (!isLevelEnabled(level, this.threshold)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      requestId: RequestContext.getRequestId(),
      context: fields.context,
      operation: fields.operation,
      event: fields.event,
      message: fields.message,
      metadata: fields.metadata ?? {},
      ...(fields.error !== undefined ? { error: normalizeError(fields.error) } : {}),
    };

    if (this.consoleEnabled) this.writeConsole(entry);
    this.fileWriter?.append(entry);
  }

  private writeConsole(entry: LogEntry): void {
    const nestLogger = new NestLogger(entry.context);
    const line = `[${entry.event}] ${entry.message}`;
    switch (entry.level) {
      case "DEBUG":
        nestLogger.debug(line);
        break;
      case "INFO":
        nestLogger.log(line);
        break;
      case "WARN":
        nestLogger.warn(line);
        break;
      case "ERROR":
        nestLogger.error(line, entry.error?.stack);
        break;
    }
  }
}
