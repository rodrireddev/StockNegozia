import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { appConfig } from "../../config/configuration";
import { AppLogger } from "../../common/logger/app-logger.service";
import type { RequestWithDevice } from "./api-access.guard";

interface MinimalRequest extends RequestWithDevice {
  method: string;
  path: string;
  originalUrl?: string;
}

/**
 * Restringe endpoints de administración de dispositivos (`/auth/devices` salvo `/me`) al
 * dispositivo administrador de la instalación — ver docs/security/DEVICE_MANAGEMENT.md §Quién
 * puede administrar dispositivos. Se aplica por ruta (`@UseGuards`), no globalmente: corre
 * siempre después de `ApiAccessGuard` (que ya autenticó la request y pobló `request.device`), así
 * que un rechazo acá es un `403 Forbidden` — el dispositivo SÍ está autenticado, solo no tiene el
 * privilegio de administrador — a diferencia de un `401` (no autenticado en absoluto).
 *
 * En `API_ACCESS_MODE=development` deja pasar todo, igual que `ApiAccessGuard` — no tiene sentido
 * exigir un dispositivo administrador cuando ni siquiera se exige autenticación.
 */
@Injectable()
export class AdminDeviceGuard implements CanActivate {
  // @Inject explícito: ver el comentario equivalente en GlobalExceptionFilter (esbuild/Vitest no
  // emite la metadata de tipos que la inyección automática de NestJS necesita).
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const config = this.configService.get<ConfigType<typeof appConfig>>("app")!;
    if (config.accessMode === "development") return true;

    const request = context.switchToHttp().getRequest<MinimalRequest>();
    if (request.device?.isAdmin) return true;

    this.logger.warn({
      context: "Auth",
      operation: `${request.method} ${request.originalUrl ?? request.path}`,
      event: "device.access.denied",
      message: "Admin-only endpoint denied to non-admin device",
      metadata: { deviceId: request.device?.id, reason: "not_admin" },
    });
    throw new ForbiddenException();
  }
}
