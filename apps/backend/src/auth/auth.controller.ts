import { Body, Controller, Inject, Post, UnauthorizedException } from "@nestjs/common";
import type { BootstrapResult } from "@stocknegozia/api-contracts";
import { bootstrapSchema, type BootstrapInput } from "@stocknegozia/validation";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AppLogger } from "../common/logger/app-logger.service";
import { BootstrapTokenService } from "./bootstrap/bootstrap-token.service";
import { Public } from "./decorators/public.decorator";
import { DevicesService } from "./devices/devices.service";

@Controller("auth")
export class AuthController {
  // @Inject explícito: ver el comentario equivalente en GlobalExceptionFilter (esbuild/Vitest no
  // emite la metadata de tipos que la inyección automática de NestJS necesita).
  constructor(
    @Inject(BootstrapTokenService) private readonly bootstrapTokenService: BootstrapTokenService,
    @Inject(DevicesService) private readonly devicesService: DevicesService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  /**
   * Bootstrap del primer dispositivo — ver docs/security/API_ACCESS.md. Público porque, por
   * definición, el cliente todavía no tiene ninguna credential; la seguridad la da el token de
   * instalación de un solo uso, no este endpoint.
   */
  @Public()
  @Post("bootstrap")
  bootstrap(@Body(new ZodValidationPipe(bootstrapSchema)) body: BootstrapInput): BootstrapResult {
    const operation = "POST /auth/bootstrap";
    this.logger.info({
      context: "AuthController",
      operation,
      event: "auth.bootstrap.started",
      message: "Bootstrap attempt started",
    });

    if (!this.bootstrapTokenService.consume(body.token)) {
      this.logger.warn({
        context: "AuthController",
        operation,
        event: "auth.bootstrap.failed",
        message: "Bootstrap failed",
        metadata: { reason: "invalid_or_expired_token" },
      });
      throw new UnauthorizedException();
    }

    // El dispositivo de bootstrap es, por definición, el primero de la instalación — se convierte
    // en el administrador (ver docs/security/DEVICE_MANAGEMENT.md §Quién puede administrar
    // dispositivos). Los dispositivos agregados después vía pairing nunca son admin por defecto.
    const result = this.devicesService.register(
      body.name ?? "Electron Desktop",
      body.type ?? "desktop",
      {
        isAdmin: true,
      },
    );
    this.logger.info({
      context: "AuthController",
      operation,
      event: "auth.bootstrap.completed",
      message: "Bootstrap completed",
      metadata: { deviceId: result.deviceId },
    });
    return result;
  }
}
