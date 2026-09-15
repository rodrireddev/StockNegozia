import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService, ConfigType } from "@nestjs/config";
import { AppModule } from "./app.module";
import { resolveLanHost } from "./auth/pairing/lan-address";
import { appConfig } from "./config/configuration";
import { createCorsOriginValidator } from "./config/cors-origin";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const config = configService.get<ConfigType<typeof appConfig>>("app")!;

  // Allowlist explícita en vez de reflejar "*" — ver docs/lan/DEVICE_MANAGEMENT.md §CORS. Sigue
  // siendo defensa en profundidad, no la barrera de seguridad real (`ApiAccessGuard`/
  // `API_ACCESS_MODE`), pero ya no acepta cualquier origen ahora que existe autenticación de
  // dispositivos LAN real.
  app.enableCors({ origin: createCorsOriginValidator(config.corsAllowedOrigins) });

  // Sin segundo argumento (host), Node escucha en todas las interfaces — ya alcanzable desde otro
  // dispositivo de la misma LAN, no solo localhost (ver docs/lan/LAN_TESTING.md).
  await app.listen(config.port);
  const lanHost = resolveLanHost(config.pairingHostOverride);
  console.log(`[backend] StockNegozia backend listening on http://localhost:${config.port}`);
  console.log(`[backend] LAN:                                http://${lanHost}:${config.port}`);
}

bootstrap();
