import { registerAs } from "@nestjs/config";
import { backendEnvSchema } from "@stocknegozia/validation";
import path from "node:path";

function loadConfig() {
  const env = backendEnvSchema.parse(process.env);

  const dataDir = env.STOCKNEGOZIA_DATA_DIR ?? path.resolve(process.cwd(), "data");

  return {
    nodeEnv: env.NODE_ENV,
    port: env.STOCKNEGOZIA_PORT,
    dataDir,
    databaseDir: path.join(dataDir, "database"),
    configDir: path.join(dataDir, "config"),
    logsDir: path.join(dataDir, "logs"),
    pluginsDir: path.join(dataDir, "plugins"),
    databaseFile: path.join(dataDir, "database", "stocknegozia.sqlite"),
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;

export const appConfig = registerAs("app", loadConfig);
