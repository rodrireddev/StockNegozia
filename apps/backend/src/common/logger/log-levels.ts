import type { LogLevel } from "./log-entry";

const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/** El `LOG_LEVEL` de configuración viene en minúsculas (`debug`/`info`/...); los logs usan mayúsculas. */
export function toLogLevel(configuredLevel: "debug" | "info" | "warn" | "error"): LogLevel {
  return configuredLevel.toUpperCase() as LogLevel;
}

export function isLevelEnabled(level: LogLevel, threshold: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[threshold];
}
