import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { appConfig } from "../../config/configuration";
import { AppLogger } from "../../common/logger/app-logger.service";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { DevicesService } from "../devices/devices.service";

/** Poblado por el guard sobre la request cuando autentica un dispositivo — ver más abajo. */
export interface RequestWithDevice {
  device?: { id: string; name: string; isAdmin: boolean };
}

interface MinimalRequest extends RequestWithDevice {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  path: string;
  originalUrl?: string;
}

function extractBearerToken(header: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return undefined;
  const [scheme, token] = raw.split(" ");
  if (scheme !== "Bearer" || !token) return undefined;
  return token;
}

/**
 * Frontera de autenticación centralizada, registrada como guard global (`APP_GUARD` en
 * `AuthModule`) — ningún controller necesita chequear manualmente un token. Ver
 * docs/security/API_ACCESS.md para el modelo completo.
 *
 * En `API_ACCESS_MODE=development` deja pasar todo (salvo lo ya marcado @Public, que siempre pasa
 * primero). En `production`, exige `Authorization: Bearer <credential>` de un dispositivo activo.
 * El rechazo es siempre un 401 genérico — el motivo real (falta credential, credential inválida,
 * dispositivo revocado) solo se registra internamente vía AppLogger, nunca en la respuesta.
 */
@Injectable()
export class ApiAccessGuard implements CanActivate {
  // @Inject explícito: ver el comentario equivalente en GlobalExceptionFilter (esbuild/Vitest no
  // emite la metadata de tipos que la inyección automática de NestJS necesita).
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(DevicesService) private readonly devicesService: DevicesService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<MinimalRequest>();
    const operation = `${request.method} ${request.originalUrl ?? request.path}`;
    const config = this.configService.get<ConfigType<typeof appConfig>>("app")!;

    if (config.accessMode === "development") {
      this.logger.debug({
        context: "Auth",
        operation,
        event: "auth.request.allowed",
        message: "Access allowed",
        metadata: { reason: "development_mode" },
      });
      return true;
    }

    const token = extractBearerToken(request.headers["authorization"]);
    if (!token) {
      this.logger.warn({
        context: "Auth",
        operation,
        event: "auth.request.denied",
        message: "Request denied",
        metadata: { reason: "missing_credential" },
      });
      throw new UnauthorizedException();
    }

    const device = this.devicesService.findByCredential(token);
    if (!device) {
      this.logger.warn({
        context: "Auth",
        operation,
        event: "auth.device.rejected",
        message: "Request denied",
        metadata: { reason: "invalid_credential" },
      });
      throw new UnauthorizedException();
    }
    if (device.status === "revoked") {
      this.logger.warn({
        context: "Auth",
        operation,
        event: "auth.device.rejected",
        message: "Request denied",
        metadata: { reason: "device_revoked" },
      });
      throw new UnauthorizedException();
    }

    this.devicesService.touchLastSeen(device.id, device.lastSeenAt);
    request.device = { id: device.id, name: device.name, isAdmin: device.isAdmin };
    this.logger.info({
      context: "Auth",
      operation,
      event: "auth.device.authenticated",
      message: "Device authenticated",
      metadata: { deviceId: device.id },
    });
    return true;
  }
}
