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
});
