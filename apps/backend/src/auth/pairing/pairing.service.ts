import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import type { PairingConfirmResult, PairingCreateResult, PairingQrPayload } from "@stocknegozia/api-contracts";
import type { PairingConfirmInput } from "@stocknegozia/validation";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { appConfig } from "../../config/configuration";
import { AppLogger } from "../../common/logger/app-logger.service";
import { CredentialService } from "../credential/credential.service";
import type { DeviceType } from "../devices/devices.types";
import { DevicesService } from "../devices/devices.service";
import { resolveLanHost } from "./lan-address";
import { PairingRepository } from "./pairing.repository";
import type { PairingSessionRow } from "./pairing.types";

const VERIFICATION_CODE_MIN = 100_000;
const VERIFICATION_CODE_MAX = 1_000_000; // exclusivo — randomInt siempre da 6 dígitos
const PAIRING_QR_TYPE = "stocknegozia-pairing" as const;
const PAIRING_QR_VERSION = 1 as const;
const DEFAULT_PAIRED_DEVICE_NAME = "Dispositivo emparejado";
const DEFAULT_PAIRED_DEVICE_TYPE: DeviceType = "mobile";

export interface CreatePairingOptions {
  /** id del dispositivo que inició el pairing — solo para logging/correlación, no autorización. */
  initiatedByDeviceId?: string;
}

/**
 * Motivos de rechazo internos (nunca expuestos en la respuesta HTTP — ver
 * docs/security/PAIRING.md §Seguridad). El cliente siempre recibe el mismo 401 genérico.
 */
type ConfirmFailureReason =
  | "not_found"
  | "already_confirmed"
  | "expired"
  | "cancelled"
  | "invalid_token"
  | "invalid_code";

/**
 * Pairing de nuevos dispositivos vía QR + código de verificación — ver docs/security/PAIRING.md.
 * Reutiliza `CredentialService` (hash genérico SHA-256) y `DevicesService` (creación de Device +
 * credential permanente) del Milestone 5; no crea un segundo sistema de credenciales. El pairing
 * token y el verification code son secretos temporales y de un solo uso, completamente distintos
 * de la credential permanente que termina emitiéndose al confirmar.
 */
@Injectable()
export class PairingService {
  // @Inject explícito: ver el comentario equivalente en GlobalExceptionFilter (esbuild/Vitest no
  // emite la metadata de tipos que la inyección automática de NestJS necesita).
  constructor(
    @Inject(PairingRepository) private readonly repository: PairingRepository,
    @Inject(CredentialService) private readonly credentialService: CredentialService,
    @Inject(DevicesService) private readonly devicesService: DevicesService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  createPairing(options: CreatePairingOptions = {}): PairingCreateResult {
    const config = this.configService.get<ConfigType<typeof appConfig>>("app")!;
    const now = new Date();
    this.repository.expireStale(now);

    const token = randomBytes(32).toString("base64url");
    const verificationCode = String(randomInt(VERIFICATION_CODE_MIN, VERIFICATION_CODE_MAX));
    const id = randomUUID();
    const expiresAt = new Date(now.getTime() + config.pairingExpirationMinutes * 60_000);

    this.repository.insert({
      id,
      tokenHash: this.credentialService.hash(token),
      verificationCodeHash: this.credentialService.hash(verificationCode),
      expiresAt,
    });

    this.logger.info({
      context: "PairingService",
      operation: "createPairing",
      event: "pairing.created",
      message: "Pairing session created",
      metadata: { pairingId: id, expiresAt: expiresAt.toISOString(), initiatedByDeviceId: options.initiatedByDeviceId },
    });

    const qr: PairingQrPayload = {
      version: PAIRING_QR_VERSION,
      type: PAIRING_QR_TYPE,
      host: resolveLanHost(config.pairingHostOverride),
      port: config.port,
      protocol: "http",
      pairingId: id,
      token,
      expiresAt: expiresAt.toISOString(),
    };

    return {
      pairingId: id,
      verificationCode,
      status: "pending",
      expiresAt: expiresAt.toISOString(),
      qr,
    };
  }

  confirmPairing(input: PairingConfirmInput): PairingConfirmResult {
    const operation = "confirmPairing";
    this.logger.info({
      context: "PairingService",
      operation,
      event: "pairing.confirmation.started",
      message: "Pairing confirmation started",
      metadata: { pairingId: input.pairingId },
    });

    const now = new Date();
    this.repository.expireStale(now);

    const session = this.repository.findById(input.pairingId);
    const failure = this.validateForConfirmation(session, input, now);
    if (failure) {
      this.logger.warn({
        context: "PairingService",
        operation,
        event: "pairing.failed",
        message: "Pairing confirmation failed",
        metadata: { pairingId: input.pairingId, reason: failure },
      });
      throw new UnauthorizedException();
    }

    const deviceType = input.deviceType ?? DEFAULT_PAIRED_DEVICE_TYPE;
    const { deviceId, credential } = this.devicesService.register(
      input.deviceName ?? DEFAULT_PAIRED_DEVICE_NAME,
      deviceType,
    );

    this.repository.confirm(input.pairingId, deviceId, now);

    this.logger.info({
      context: "PairingService",
      operation,
      event: "pairing.confirmed",
      message: "Pairing confirmed",
      metadata: { pairingId: input.pairingId, deviceId, deviceType },
    });

    return {
      device: { id: deviceId, name: input.deviceName ?? DEFAULT_PAIRED_DEVICE_NAME, type: deviceType },
      credential,
    };
  }

  /** Cancela una sesión propia todavía PENDING — ver docs/security/PAIRING.md §Cancelación. */
  cancelPairing(pairingId: string): void {
    const now = new Date();
    this.repository.expireStale(now);

    const session = this.repository.findById(pairingId);
    if (!session || session.status !== "pending") {
      this.logger.warn({
        context: "PairingService",
        operation: "cancelPairing",
        event: "pairing.failed",
        message: "Pairing cancellation failed",
        metadata: { pairingId, reason: !session ? "not_found" : session.status },
      });
      throw new UnauthorizedException();
    }

    this.repository.updateStatus(pairingId, "cancelled");
    this.logger.info({
      context: "PairingService",
      operation: "cancelPairing",
      event: "pairing.cancelled",
      message: "Pairing cancelled",
      metadata: { pairingId },
    });
  }

  private validateForConfirmation(
    session: PairingSessionRow | undefined,
    input: PairingConfirmInput,
    now: Date,
  ): ConfirmFailureReason | null {
    if (!session) return "not_found";
    if (session.status === "confirmed") return "already_confirmed";
    if (session.status === "cancelled") return "cancelled";
    if (session.status === "expired" || session.expiresAt.getTime() < now.getTime()) return "expired";
    if (this.credentialService.hash(input.token) !== session.tokenHash) return "invalid_token";
    if (this.credentialService.hash(input.verificationCode) !== session.verificationCodeHash) {
      return "invalid_code";
    }
    return null;
  }
}
