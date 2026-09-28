import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { LogLevel } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { AppModule } from "./app.module";
import { appConfig } from "./config/configuration";

/**
 * `LOG_LEVEL` se leía en `configuration.ts` pero nunca se aplicaba — Nest usaba su default (todos
 * los niveles) sin importar el valor de la variable. Nest habilita niveles por lista, no por
 * umbral ("log" es su nombre para lo que acá llamamos "info"), así que hay que armar el array.
 */
const LOG_LEVELS_BY_MIN_LEVEL: Record<string, LogLevel[]> = {
  debug: ["debug", "log", "warn", "error"],
  info: ["log", "warn", "error"],
  warn: ["warn", "error"],
  error: ["error"],
};

async function bootstrap() {
  // Se lee `process.env` directo acá (no vía `ConfigService`/`appConfig`) porque el nivel de log
  // tiene que decidirse ANTES de crear la app — para entonces `configService` todavía no existe.
  const logLevels = LOG_LEVELS_BY_MIN_LEVEL[process.env.LOG_LEVEL ?? "info"] ?? LOG_LEVELS_BY_MIN_LEVEL.info;
  const app = await NestFactory.create(AppModule, { logger: logLevels });
  const configService = app.get(ConfigService);
  const config = configService.get<ConfigType<typeof appConfig>>("app")!;

  // Allowlist explícita (panel de administración, futuros clientes) — mismo patrón que
  // apps/backend, sin el caso especial de LAN que no aplica a un backend multi-tenant por
  // internet.
  app.enableCors({ origin: config.corsAllowedOrigins.length > 0 ? config.corsAllowedOrigins : false });

  await app.listen(config.port);
  console.log(`[cloud-backend] StockNegozia cloud backend listening on port ${config.port}`);
}

bootstrap();
