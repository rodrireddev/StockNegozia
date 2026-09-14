import { AppLogger } from "../common/logger/app-logger.service";

/** Logger silencioso para tests que no verifican contenido de logs (sin consola, sin persistencia). */
export function createSilentTestLogger(): AppLogger {
  return new AppLogger({ level: "debug", dir: "", persistence: false, console: false });
}
