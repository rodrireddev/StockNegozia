export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogErrorInfo {
  name: string;
  message: string;
  stack?: string;
}

/**
 * Contrato de diagnóstico persistente — ver docs/logging/LOG_SCHEMA.md. `event` es un
 * identificador técnico estable (no cambia entre versiones); `message` es descriptivo para
 * humanos y puede cambiar libremente.
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId?: string;
  context: string;
  operation?: string;
  event: string;
  message: string;
  metadata?: Record<string, unknown>;
  error?: LogErrorInfo;
}
