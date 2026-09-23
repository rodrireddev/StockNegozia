import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService, ConfigType } from "@nestjs/config";
import { AppModule } from "./app.module";
import { appConfig } from "./config/configuration";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
