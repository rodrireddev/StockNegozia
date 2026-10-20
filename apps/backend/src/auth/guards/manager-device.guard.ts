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
 * Bloquea a los dispositivos con rol `cashier` (ver `DeviceRole`) — se aplica por ruta
 * (`@UseGuards`) en lo que un cajero no debe ver ni hacer: finanzas, compras, ajustes de caja,
 * edición de productos/proveedores/configuración y cancelar ventas. Mismo criterio que
 * `AdminDeviceGuard`: `403` (autenticado pero sin permiso), y en `API_ACCESS_MODE=development`
 * deja pasar todo. El dispositivo administrador siempre pasa, aunque figure como cajero.
 */
@Injectable()
export class ManagerDeviceGuard implements CanActivate {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const config = this.configService.get<ConfigType<typeof appConfig>>("app")!;
    if (config.accessMode === "development") return true;

    const request = context.switchToHttp().getRequest<MinimalRequest>();
    if (request.device?.isAdmin || request.device?.role === "manager") return true;

    this.logger.warn({
      context: "Auth",
      operation: `${request.method} ${request.originalUrl ?? request.path}`,
      event: "device.access.denied",
      message: "Manager-only endpoint denied to cashier device",
      metadata: { deviceId: request.device?.id, reason: "cashier_role" },
    });
    throw new ForbiddenException("Tu dispositivo tiene rol Cajero: pedile acceso al encargado.");
  }
}
