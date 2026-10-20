import { Controller, Get, INestApplication, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppLogger } from "../common/logger/app-logger.service";
import { GlobalExceptionFilter } from "../common/logger/global-exception.filter";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import { createTestDb } from "../test/create-test-db";
import { AuthController } from "./auth.controller";
import { BootstrapTokenService } from "./bootstrap/bootstrap-token.service";
import { CredentialService } from "./credential/credential.service";
import { DevicesController } from "./devices/devices.controller";
import { DevicesRepository } from "./devices/devices.repository";
import { DevicesService } from "./devices/devices.service";
import { AdminDeviceGuard } from "./guards/admin-device.guard";
import { ApiAccessGuard } from "./guards/api-access.guard";
import { ManagerDeviceGuard } from "./guards/manager-device.guard";
import { PairingController } from "./pairing/pairing.controller";
import { PairingRepository } from "./pairing/pairing.repository";
import { PairingService } from "./pairing/pairing.service";

/** Simula una ruta de encargado (ej. `/finance`) y una abierta a cajeros (ej. `POST /sales`). */
@Controller("role-test")
class RoleTestController {
  @UseGuards(ManagerDeviceGuard)
  @Get("manager")
  manager() {
    return { ok: true };
  }

  @Get("open")
  open() {
    return { ok: true };
  }
}

describe("Roles de dispositivo (Encargado / Cajero)", () => {
  let app: INestApplication;
  let dir: string;
  let adminCredential: string;
  let adminDeviceId: string;
  let mobile: { deviceId: string; credential: string };

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-roles-"));
    const logger = new AppLogger({ level: "error", dir, persistence: false, console: false });
    const config = {
      accessMode: "production",
      configDir: path.join(dir, "config"),
      port: 38123,
      pairingExpirationMinutes: 5,
      pairingHostOverride: "192.168.1.50",
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, PairingController, DevicesController, RoleTestController],
      providers: [
        { provide: AppLogger, useValue: logger },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
        { provide: DRIZZLE_CLIENT, useValue: createTestDb() },
        DevicesRepository,
        DevicesService,
        CredentialService,
        BootstrapTokenService,
        PairingRepository,
        PairingService,
        AdminDeviceGuard,
        ManagerDeviceGuard,
        Reflector,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { provide: ConfigService, useValue: { get: () => config } as any },
        { provide: APP_GUARD, useClass: ApiAccessGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const server = app.getHttpServer();
    const bootstrapToken = readFileSync(path.join(config.configDir, "bootstrap.token"), "utf-8");
    const bootstrap = await request(server)
      .post("/auth/bootstrap")
      .send({ token: bootstrapToken, name: "Desktop", type: "desktop" });
    adminCredential = bootstrap.body.credential;
    adminDeviceId = bootstrap.body.deviceId;

    const created = await request(server)
      .post("/auth/pairing")
      .set("Authorization", `Bearer ${adminCredential}`);
    const confirmed = await request(server).post("/auth/pairing/confirm").send({
      pairingId: created.body.pairingId,
      token: created.body.qr.token,
      verificationCode: created.body.verificationCode,
      deviceName: "Celu caja",
      deviceType: "mobile",
    });
    mobile = { deviceId: confirmed.body.device.id, credential: confirmed.body.credential };
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const as = (credential: string, url: string) =>
    request(app.getHttpServer()).get(url).set("Authorization", `Bearer ${credential}`);
  const setRole = (credential: string, deviceId: string, role: string) =>
    request(app.getHttpServer())
      .patch(`/auth/devices/${deviceId}/role`)
      .set("Authorization", `Bearer ${credential}`)
      .send({ role });

  it("un dispositivo nuevo es Encargado por defecto (no pierde acceso al actualizar)", async () => {
    const me = await as(mobile.credential, "/auth/devices/me");
    expect(me.body.role).toBe("manager");
    expect((await as(mobile.credential, "/role-test/manager")).status).toBe(200);
  });

  it("como Cajero: 403 en rutas de encargado, sigue pudiendo usar las abiertas", async () => {
    const res = await setRole(adminCredential, mobile.deviceId, "cashier");
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("cashier");

    expect((await as(mobile.credential, "/role-test/manager")).status).toBe(403);
    expect((await as(mobile.credential, "/role-test/open")).status).toBe(200);
  });

  it("solo el administrador cambia roles — un cajero no puede volver a hacerse encargado", async () => {
    expect((await setRole(mobile.credential, mobile.deviceId, "manager")).status).toBe(403);
    expect((await setRole(adminCredential, mobile.deviceId, "jefe")).status).toBe(400);
  });

  it("el administrador pasa aunque figure como Cajero", async () => {
    await setRole(adminCredential, adminDeviceId, "cashier");
    expect((await as(adminCredential, "/role-test/manager")).status).toBe(200);
  });
});
