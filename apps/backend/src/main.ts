import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService, ConfigType } from "@nestjs/config";
import { AppModule } from "./app.module";
import { appConfig } from "./config/configuration";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const config = configService.get<ConfigType<typeof appConfig>>("app")!;

  // El renderer de Electron sirve desde un origen distinto (localhost:5173 en dev,
  // file:// empaquetado), por lo que necesita CORS para consumir esta API local.
  app.enableCors();

  await app.listen(config.port);
  console.log(`[backend] StockNegozia backend listening on http://localhost:${config.port}`);
}

bootstrap();
