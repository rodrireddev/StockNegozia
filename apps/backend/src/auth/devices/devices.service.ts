import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DeviceDto } from "@stocknegozia/api-contracts";
import { randomUUID } from "node:crypto";
import { AppLogger } from "../../common/logger/app-logger.service";
import { CredentialService } from "../credential/credential.service";
import { DevicesRepository } from "./devices.repository";
import type { AuthenticatedDevice, DeviceRole, DeviceType } from "./devices.types";

/**
 * `lastSeenAt` no se actualiza en cada request autenticado (sería una escritura a SQLite por
 * request) sino a lo sumo una vez por este intervalo — ver `touchLastSeen`.
 */
const LAST_SEEN_THROTTLE_MS = 60_000;

type DeviceRow = ReturnType<DevicesRepository["findById"]>;

function toDto(row: NonNullable<DeviceRow>): DeviceDto {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    active: row.status === "active",
    isAdmin: row.isAdmin,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
    sellerName: row.sellerName,
  };
}

export interface RegisterDeviceOptions {
  /**
   * El dispositivo creado por bootstrap es el administrador de la instalación — ver
   * docs/security/DEVICE_MANAGEMENT.md §Quién puede administrar dispositivos. Los dispositivos
   * creados por pairing nunca son admin por defecto.
   */
  isAdmin?: boolean;
}

@Injectable()
export class DevicesService {
  // @Inject explícito en todos los parámetros: la inyección automática por tipo de NestJS depende
  // de metadata que `tsc` emite pero esbuild (usado por Vitest) no — ver el mismo comentario en
  // GlobalExceptionFilter.
  constructor(
    @Inject(DevicesRepository) private readonly repository: DevicesRepository,
    @Inject(CredentialService) private readonly credentialService: CredentialService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  hasActiveDevice(): boolean {
    return this.repository.countActive() > 0;
  }

  register(
    name: string,
    type: DeviceType,
    options: RegisterDeviceOptions = {},
  ): { deviceId: string; credential: string } {
    const { credential, credentialHash } = this.credentialService.generate();
    const id = randomUUID();
    this.repository.insert({ id, name, type, credentialHash, isAdmin: options.isAdmin ?? false });
    this.logger.info({
      context: "DevicesService",
      operation: "register",
      event: "device.created",
      message: "Device created",
      metadata: { deviceId: id, deviceType: type, isAdmin: options.isAdmin ?? false },
    });
    return { deviceId: id, credential };
  }

  /**
   * Busca el dispositivo dueño de una credential, sin importar su status — el llamador (el guard)
   * decide qué hacer con un dispositivo revocado. Devuelve `undefined` tanto si la credential no
   * existe como si nunca existió: distinguir esos dos casos no le corresponde a este método.
   */
  findByCredential(rawCredential: string): AuthenticatedDevice | undefined {
    const credentialHash = this.credentialService.hash(rawCredential);
    const row = this.repository.findByCredentialHash(credentialHash);
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      lastSeenAt: row.lastSeenAt,
      isAdmin: row.isAdmin,
      role: row.role,
      sellerName: row.sellerName,
    };
  }

  touchLastSeen(deviceId: string, lastSeenAt: Date | null): void {
    const now = Date.now();
    if (lastSeenAt && now - lastSeenAt.getTime() < LAST_SEEN_THROTTLE_MS) return;
    this.repository.updateLastSeen(deviceId, new Date(now));
  }

  /** `GET /auth/devices` — solo dispositivos administradores (ver `AdminDeviceGuard`). */
  list(requestedByDeviceId?: string): DeviceDto[] {
    const rows = this.repository.findAll();
    this.logger.info({
      context: "DevicesService",
      operation: "list",
      event: "device.listed",
      message: "Devices listed",
      metadata: { count: rows.length, requestedBy: requestedByDeviceId },
    });
    return rows.map(toDto);
  }

  /** `GET /auth/devices/:id` y `GET /auth/devices/me`. */
  getById(id: string, requestedByDeviceId?: string): DeviceDto {
    const row = this.repository.findById(id);
    if (!row) throw new NotFoundException("Dispositivo no encontrado");
    this.logger.info({
      context: "DevicesService",
      operation: "getById",
      event: "device.viewed",
      message: "Device viewed",
      metadata: { deviceId: id, requestedBy: requestedByDeviceId },
    });
    return toDto(row);
  }

  /** `PATCH /auth/devices/:id` — únicamente permite renombrar (ver `updateDeviceSchema`). */
  updateName(id: string, name: string, requestedByDeviceId?: string): DeviceDto {
    const row = this.repository.findById(id);
    if (!row) throw new NotFoundException("Dispositivo no encontrado");

    this.repository.updateName(id, name);
    this.logger.info({
      context: "DevicesService",
      operation: "updateName",
      event: "device.updated",
      message: "Device updated",
      metadata: { deviceId: id, requestedBy: requestedByDeviceId },
    });
    return toDto(this.repository.findById(id)!);
  }

  /** `PATCH /auth/devices/:id/role` — solo el dispositivo administrador (`AdminDeviceGuard`). */
  updateRole(id: string, role: DeviceRole, requestedByDeviceId?: string): DeviceDto {
    const row = this.repository.findById(id);
    if (!row) throw new NotFoundException("Dispositivo no encontrado");

    this.repository.updateRole(id, role);
    this.logger.info({
      context: "DevicesService",
      operation: "updateRole",
      event: "device.role.updated",
      message: "Device role updated",
      metadata: { deviceId: id, role, requestedBy: requestedByDeviceId },
    });
    return toDto(this.repository.findById(id)!);
  }

  /**
   * `PATCH /auth/devices/me/seller-name` — a diferencia de `updateName`, es siempre
   * auto-servicio: un dispositivo solo puede fijar SU PROPIO vendedor actual (ver
   * docs/inventory/STOCK_MOVEMENTS.md §Trazabilidad), nunca el de otro dispositivo.
   */
  updateSellerName(id: string, sellerName: string): DeviceDto {
    const row = this.repository.findById(id);
    if (!row) throw new NotFoundException("Dispositivo no encontrado");

    this.repository.updateSellerName(id, sellerName);
    this.logger.info({
      context: "DevicesService",
      operation: "updateSellerName",
      event: "device.seller_name.updated",
      message: "Device seller name updated",
      metadata: { deviceId: id },
    });
    return toDto(this.repository.findById(id)!);
  }

  /**
   * Revoca un dispositivo — a partir de ahora su credential deja de autenticar,
   * permanentemente (no existe reactivación, ver docs/security/DEVICE_MANAGEMENT.md
   * §Revocación permanente). Idempotente: revocar un dispositivo ya revocado no falla ni vuelve a
   * auditar (`segundo revoke se comporta correctamente`).
   *
   * `requestedByDeviceId` habilita la protección contra auto-revocación (§Protección contra
   * auto-revocación): un dispositivo administrador no puede revocarse a sí mismo si es el único
   * administrador activo — dejaría la instalación sin ningún dispositivo capaz de administrar
   * otros dispositivos.
   */
  revoke(deviceId: string, requestedByDeviceId?: string): DeviceDto {
    const row = this.repository.findById(deviceId);
    if (!row) throw new NotFoundException("Dispositivo no encontrado");

    if (row.status === "revoked") {
      return toDto(row);
    }

    if (
      requestedByDeviceId === deviceId &&
      row.isAdmin &&
      this.repository.countActiveAdmins() <= 1
    ) {
      throw new ConflictException(
        "No se puede revocar el único dispositivo administrador activo de la instalación",
      );
    }

    this.repository.updateStatus(deviceId, "revoked");
    this.logger.info({
      context: "DevicesService",
      operation: "revoke",
      event: "device.revoked",
      message: "Device revoked",
      metadata: { deviceId, requestedBy: requestedByDeviceId },
    });
    return toDto(this.repository.findById(deviceId)!);
  }
}
