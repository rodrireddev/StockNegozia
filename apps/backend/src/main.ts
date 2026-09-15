import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService, ConfigType } from "@nestjs/config";
import { AppModule } from "./app.module";
import { resolveLanHost } from "./auth/pairing/lan-address";
import { appConfig } from "./config/configuration";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const config = configService.get<ConfigType<typeof appConfig>>("app")!;

  // El renderer de Electron sirve desde un origen distinto (localhost:5173 en dev,
  // file:// empaquetado), por lo que necesita CORS para consumir esta API local. Sin `origin`
  // explícito, refleja "*" — cualquier origen puede leer la respuesta (ver
  // docs/lan/LAN_TESTING.md §CORS para el análisis: la frontera de seguridad real es
  // `ApiAccessGuard`/`API_ACCESS_MODE`, no el origen del request, así que esto también permite el
  // cliente web de prueba LAN sin cambios).
  app.enableCors();

  // Sin segundo argumento (host), Node escucha en todas las interfaces — ya alcanzable desde otro
  // dispositivo de la misma LAN, no solo localhost (ver docs/lan/LAN_TESTING.md).
  await app.listen(config.port);
  const lanHost = resolveLanHost(config.pairingHostOverride);
  console.log(`[backend] StockNegozia backend listening on http://localhost:${config.port}`);
  console.log(`[backend] LAN:                                http://${lanHost}:${config.port}`);
}

bootstrap();
