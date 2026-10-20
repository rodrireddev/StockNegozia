import { ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it } from "vitest";
import { createSilentTestLogger } from "../../test/create-test-logger";
import { createTestDb } from "../../test/create-test-db";
import type { Database } from "../../database/database.types";
import { CredentialService } from "../credential/credential.service";
import { DevicesRepository } from "./devices.repository";
import { DevicesService } from "./devices.service";

describe("DevicesService", () => {
  let db: Database;
  let service: DevicesService;

  beforeEach(() => {
    db = createTestDb();
    const repository = new DevicesRepository(db);
    const credentialService = new CredentialService();
    const logger = createSilentTestLogger();
    service = new DevicesService(repository, credentialService, logger);
  });

  it("no hay dispositivo activo antes de registrar ninguno", () => {
    expect(service.hasActiveDevice()).toBe(false);
  });

  it("register crea un dispositivo activo y devuelve una credential utilizable", () => {
    const { deviceId, credential } = service.register("Test Desktop", "desktop");
    expect(deviceId).toBeTruthy();
    expect(credential).toBeTruthy();
    expect(service.hasActiveDevice()).toBe(true);

    const found = service.findByCredential(credential);
    expect(found?.id).toBe(deviceId);
    expect(found?.status).toBe("active");
  });

  it("findByCredential no encuentra nada para una credential inexistente", () => {
    service.register("Test Desktop", "desktop");
    expect(service.findByCredential("sn_nunca-existio")).toBeUndefined();
  });

  it("revoke marca el dispositivo como revoked; su credential sigue siendo encontrable pero con ese status", () => {
    const { deviceId, credential } = service.register("Test Desktop", "desktop");
    service.revoke(deviceId);

    const found = service.findByCredential(credential);
    expect(found?.status).toBe("revoked");
  });

  it("touchLastSeen actualiza lastSeenAt la primera vez", () => {
    const { deviceId, credential } = service.register("Test Desktop", "desktop");
    expect(service.findByCredential(credential)?.lastSeenAt).toBeNull();

    service.touchLastSeen(deviceId, null);

    expect(service.findByCredential(credential)?.lastSeenAt).not.toBeNull();
  });

  it("touchLastSeen no vuelve a escribir si el último update fue reciente (throttle)", () => {
    const { deviceId, credential } = service.register("Test Desktop", "desktop");

    service.touchLastSeen(deviceId, null); // primera escritura — lastSeenAt era null
    const firstLastSeen = service.findByCredential(credential)?.lastSeenAt ?? null;
    expect(firstLastSeen).not.toBeNull();

    service.touchLastSeen(deviceId, firstLastSeen); // dentro de la ventana de throttle
    const secondLastSeen = service.findByCredential(credential)?.lastSeenAt ?? null;

    expect(secondLastSeen?.getTime()).toBe(firstLastSeen?.getTime());
  });

  it("register acepta isAdmin y findByCredential lo devuelve", () => {
    const admin = service.register("Desktop", "desktop", { isAdmin: true });
    const client = service.register("Mobile", "mobile");

    expect(service.findByCredential(admin.credential)?.isAdmin).toBe(true);
    expect(service.findByCredential(client.credential)?.isAdmin).toBe(false);
  });

  describe("Device Management", () => {
    it("list devuelve todos los devices sin exponer secretos", () => {
      service.register("Desktop", "desktop", { isAdmin: true });
      service.register("Mobile", "mobile");

      const list = service.list();
      expect(list).toHaveLength(2);
      for (const device of list) {
        expect(device).not.toHaveProperty("credentialHash");
        expect(device).not.toHaveProperty("credential");
      }
    });

    it("getById devuelve el device público sin credentialHash", () => {
      const { deviceId } = service.register("Desktop", "desktop", { isAdmin: true });

      const dto = service.getById(deviceId);
      expect(dto.id).toBe(deviceId);
      expect(dto.name).toBe("Desktop");
      expect(dto.type).toBe("desktop");
      expect(dto.active).toBe(true);
      expect(dto.isAdmin).toBe(true);
      expect(dto).not.toHaveProperty("credentialHash");
    });

    it("getById de un device inexistente lanza NotFoundException", () => {
      expect(() => service.getById("00000000-0000-0000-0000-000000000000")).toThrow(
        NotFoundException,
      );
    });

    it("updateName cambia el nombre y lo persiste", () => {
      const { deviceId } = service.register("Desktop", "desktop", { isAdmin: true });

      const updated = service.updateName(deviceId, "Nueva PC de Juan");
      expect(updated.name).toBe("Nueva PC de Juan");
      expect(service.getById(deviceId).name).toBe("Nueva PC de Juan");
    });

    it("updateName de un device inexistente lanza NotFoundException", () => {
      expect(() => service.updateName("00000000-0000-0000-0000-000000000000", "x")).toThrow(
        NotFoundException,
      );
    });

    it("updateName no permite modificar campos sensibles (solo acepta name)", () => {
      const { deviceId, credential } = service.register("Desktop", "desktop", { isAdmin: true });
      service.updateName(deviceId, "Otro nombre");

      // La credential original sigue funcionando exactamente igual — updateName no la toca.
      const found = service.findByCredential(credential);
      expect(found?.id).toBe(deviceId);
      expect(found?.status).toBe("active");
    });

    it("un device nuevo no tiene vendedor configurado", () => {
      const { deviceId } = service.register("Desktop", "desktop", { isAdmin: true });
      expect(service.getById(deviceId).sellerName).toBeNull();
    });

    it("updateSellerName fija el vendedor actual y lo persiste", () => {
      const { deviceId } = service.register("Desktop", "desktop", { isAdmin: true });

      const updated = service.updateSellerName(deviceId, "Rodrigo");
      expect(updated.sellerName).toBe("Rodrigo");
      expect(service.getById(deviceId).sellerName).toBe("Rodrigo");
    });

    it("updateSellerName permite reemplazar el vendedor sin afectar el nombre del dispositivo", () => {
      const { deviceId } = service.register("Desktop", "desktop", { isAdmin: true });
      service.updateSellerName(deviceId, "Rodrigo");

      const updated = service.updateSellerName(deviceId, "Ana");
      expect(updated.sellerName).toBe("Ana");
      expect(updated.name).toBe("Desktop");
    });

    it("updateSellerName de un device inexistente lanza NotFoundException", () => {
      expect(() =>
        service.updateSellerName("00000000-0000-0000-0000-000000000000", "Rodrigo"),
      ).toThrow(NotFoundException);
    });

    it("revoke invalida la credential permanentemente y genera auditoría", () => {
      const admin = service.register("Desktop", "desktop", { isAdmin: true });
      const client = service.register("Mobile", "mobile");

      const result = service.revoke(client.deviceId, admin.deviceId);
      expect(result.active).toBe(false);

      const found = service.findByCredential(client.credential);
      expect(found?.status).toBe("revoked");
    });

    it("revocar un device inexistente lanza NotFoundException", () => {
      expect(() => service.revoke("00000000-0000-0000-0000-000000000000")).toThrow(
        NotFoundException,
      );
    });

    it("un segundo revoke sobre el mismo device es idempotente (no falla, no lo reactiva)", () => {
      const admin = service.register("Desktop", "desktop", { isAdmin: true });
      const client = service.register("Mobile", "mobile");

      const first = service.revoke(client.deviceId, admin.deviceId);
      const second = service.revoke(client.deviceId, admin.deviceId);

      expect(first.active).toBe(false);
      expect(second.active).toBe(false);
    });

    it("no existe ninguna operación para reactivar un device revocado", () => {
      const prototype = DevicesService.prototype as unknown as Record<string, unknown>;
      expect(prototype["reactivate"]).toBeUndefined();
      expect(prototype["restore"]).toBeUndefined();
      expect(prototype["unrevoke"]).toBeUndefined();
      expect(prototype["enable"]).toBeUndefined();
    });

    it("un dispositivo administrador único no puede revocarse a sí mismo", () => {
      const admin = service.register("Desktop", "desktop", { isAdmin: true });

      expect(() => service.revoke(admin.deviceId, admin.deviceId)).toThrow(ConflictException);
      // Sigue activo: la protección no debe haber aplicado la revocación parcialmente.
      expect(service.findByCredential(admin.credential)?.status).toBe("active");
    });

    it("un dispositivo administrador SÍ puede revocarse a sí mismo si existe otro admin activo", () => {
      const admin1 = service.register("Desktop 1", "desktop", { isAdmin: true });
      service.register("Desktop 2", "desktop", { isAdmin: true });

      const result = service.revoke(admin1.deviceId, admin1.deviceId);
      expect(result.active).toBe(false);
    });

    it("un admin puede revocar a otro dispositivo sin restricción de auto-revocación", () => {
      const admin = service.register("Desktop", "desktop", { isAdmin: true });
      const client = service.register("Mobile", "mobile");

      expect(() => service.revoke(client.deviceId, admin.deviceId)).not.toThrow();
    });
  });
});
