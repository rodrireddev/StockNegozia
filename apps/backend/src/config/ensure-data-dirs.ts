import { mkdirSync } from "node:fs";
import type { AppConfig } from "./configuration";

export function ensureDataDirs(config: AppConfig): void {
  for (const dir of [config.databaseDir, config.configDir, config.logsDir, config.pluginsDir]) {
    mkdirSync(dir, { recursive: true });
  }
}
