import { registerAs } from "@nestjs/config";
import { backendEnvSchema } from "@stocknegozia/validation";
import path from "node:path";

function loadConfig() {
  const env = backendEnvSchema.parse(process.env);

  const dataDir = env.STOCKNEGOZIA_DATA_DIR ?? path.resolve(process.cwd(), "data");

  const logsDir = path.join(dataDir, "logs");

  return {
    nodeEnv: env.NODE_ENV,
    port: env.STOCKNEGOZIA_PORT,
    dataDir,
    databaseDir: path.join(dataDir, "database"),
    configDir: path.join(dataDir, "config"),
    logsDir,
    pluginsDir: path.join(dataDir, "plugins"),
    databaseFile: path.join(dataDir, "database", "stocknegozia.sqlite"),
    logLevel: env.LOG_LEVEL,
    // Por defecto reutiliza el mismo dataDir que ya usan SQLite/config/plugins (Etapa 1) en vez
    // de un "./logs" nuevo — LOG_DIR permite overridearlo.
    logDir: env.LOG_DIR ?? logsDir,
    logPersistence: env.LOG_PERSISTENCE,
    logConsole: env.LOG_CONSOLE,
    accessMode: env.API_ACCESS_MODE,
    pairingExpirationMinutes: env.PAIRING_EXPIRATION_MINUTES,
    pairingHostOverride: env.PAIRING_HOST,
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;

export const appConfig = registerAs("app", loadConfig);
