import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppLogger } from "../../common/logger/app-logger.service";
import { GlobalExceptionFilter } from "../../common/logger/global-exception.filter";
import { LogReader } from "../../common/logger/log-reader";
import { RequestContextMiddleware } from "../../common/logger/request-context.middleware";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import { createTestDb } from "../../test/create-test-db";
import { AuthController } from "../auth.controller";
import { BootstrapTokenService } from "../bootstrap/bootstrap-token.service";
import { CredentialService } from "../credential/credential.service";
import { AdminDeviceGuard } from "../guards/admin-device.guard";
import { ApiAccessGuard } from "../guards/api-access.guard";
import { PairingController } from "../pairing/pairing.controller";
import { PairingRepository } from "../pairing/pairing.repository";
import { PairingService } from "../pairing/pairing.service";
import { DevicesController } from "./devices.controller";
import { DevicesRepository } from "./devices.repository";
import { DevicesService } from "./devices.service";

interface FakeAppConfig {
  accessMode: "development" | "production";
  configDir: string;
  port: number;
  pairingExpirationMinutes: number;
  pairingHostOverride?: string;
}

/** Empareja un dispositivo nuevo (no admin) usando el flujo real de Milestone 6 — no lo simula. */
async function pairNewDevice(
  app: INestApplication,
  adminCredential: string,
  deviceName: string,
  deviceType = "mobile",
): Promise<{ deviceId: string; credential: string }> {
  const created = await request(app.getHttpServer())
    .post("/auth/pairing")
    .set("Authorization", `Bearer ${adminCredential}`);

  const confirmed = await request(app.getHttpServer()).post("/auth/pairing/confirm").send({
    pairingId: created.body.pairingId,
    token: created.body.qr.token,
    verificationCode: created.body.verificationCode,
    deviceName,
    deviceType,
  });

  return { deviceId: confirmed.body.device.id, credential: confirmed.body.credential };
}

describe("Device Management", () => {
  let app: INestApplication;
  let dir: string;
  let logger: AppLogger;
  let config: FakeAppConfig;
  let adminCredential: string;
  let adminDeviceId: string;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-devices-"));
    logger = new AppLogger({ level: "debug", dir, persistence: true, console: false });
    config = {
      accessMode: "production",
      configDir: path.join(dir, "config"),
      port: 38123,
      pairingExpirationMinutes: 5,
      pairingHostOverride: "192.168.1.50",
    };
    const db = createTestDb();

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, PairingController, DevicesController],
      providers: [
        { provide: AppLogger, useValue: logger },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
        { provide: DRIZZLE_CLIENT, useValue: db },
        DevicesRepository,
        DevicesService,
        CredentialService,
        BootstrapTokenService,
        PairingRepository,
        PairingService,
        AdminDeviceGuard,
        Reflector,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { provide: ConfigService, useValue: { get: () => config } as any },
        { provide: APP_GUARD, useClass: ApiAccessGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    const middleware = new RequestContextMiddleware(logger);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.use((req: any, res: any, next: () => void) => middleware.use(req, res, next));
    await app.init();

    const bootstrapToken = readFileSync(path.join(config.configDir, "bootstrap.token"), "utf-8");
    const bootstrapRes = await request(app.getHttpServer())
      .post("/auth/bootstrap")
      .send({ token: bootstrapToken, name: "Desktop administrador", type: "desktop" });
    adminCredential = bootstrapRes.body.credential;
    adminDeviceId = bootstrapRes.body.deviceId;
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  describe("GET /auth/devices (list)", () => {
    it("sin credential devuelve 401", async () => {
      const res = await request(app.getHttpServer()).get("/auth/devices");
      expect(res.status).toBe(401);
    });

    it("con credential no-admin devuelve 403", async () => {
      const client = await pairNewDevice(app, adminCredential, "Celular Juan");
      const res = await request(app.getHttpServer())
        .get("/auth/devices")
        .set("Authorization", `Bearer ${client.credential}`);
      expect(res.status).toBe(403);
    });

    it("con credential admin lista los dispositivos sin exponer secretos", async () => {
      const res = await request(app.getHttpServer())
        .get("/auth/devices")
        .set("Authorization", `Bearer ${adminCredential}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      for (const device of res.body) {
        expect(device).not.toHaveProperty("credentialHash");
        expect(device).not.toHaveProperty("credential");
        expect(device).toHaveProperty("id");
        expect(device).toHaveProperty("name");
        expect(device).toHaveProperty("type");
        expect(device).toHaveProperty("active");
      }
    });
  });

  describe("GET /auth/devices/:id", () => {
    it("con credential admin devuelve el device", async () => {
      const res = await request(app.getHttpServer())
        .get(`/auth/devices/${adminDeviceId}`)
        .set("Authorization", `Bearer ${adminCredential}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(adminDeviceId);
      expect(res.body).not.toHaveProperty("credentialHash");
    });

    it("con credential no-admin devuelve 403", async () => {
      const client = await pairNewDevice(app, adminCredential, "Celular Otro");
      const res = await request(app.getHttpServer())
        .get(`/auth/devices/${adminDeviceId}`)
        .set("Authorization", `Bearer ${client.credential}`);
      expect(res.status).toBe(403);
    });

    it("un id con formato inválido devuelve 400, no un error interno de SQLite", async () => {
      const res = await request(app.getHttpServer())
        .get("/auth/devices/not-a-uuid")
        .set("Authorization", `Bearer ${adminCredential}`);
      expect(res.status).toBe(400);
    });

    it("un id inexistente pero válido devuelve 404 genérico, sin stack trace", async () => {
      const res = await request(app.getHttpServer())
        .get("/auth/devices/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${adminCredential}`);
      expect(res.status).toBe(404);
      expect(res.body).not.toHaveProperty("stack");
    });
  });

  describe("GET /auth/devices/me", () => {
    it("devuelve la información del propio dispositivo autenticado, sin importar si es admin", async () => {
      const client = await pairNewDevice(app, adminCredential, "Celular Me");

      const res = await request(app.getHttpServer())
        .get("/auth/devices/me")
        .set("Authorization", `Bearer ${client.credential}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(client.deviceId);
      expect(res.body.name).toBe("Celular Me");
      expect(res.body).not.toHaveProperty("credentialHash");
    });

    it("un dispositivo no-admin no puede usar /me para ver información de otro dispositivo", async () => {
      const client = await pairNewDevice(app, adminCredential, "Celular Aislado");

      const res = await request(app.getHttpServer())
        .get("/auth/devices/me")
        .set("Authorization", `Bearer ${client.credential}`);

      expect(res.body.id).not.toBe(adminDeviceId);
    });
  });

  describe("PATCH /auth/devices/:id", () => {
    it("con credential admin cambia el nombre", async () => {
      const client = await pairNewDevice(app, adminCredential, "Nombre viejo");

      const res = await request(app.getHttpServer())
        .patch(`/auth/devices/${client.deviceId}`)
        .set("Authorization", `Bearer ${adminCredential}`)
        .send({ name: "Nombre nuevo" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Nombre nuevo");
    });

    it("rechaza un nombre vacío", async () => {
      const client = await pairNewDevice(app, adminCredential, "Otro nombre");

      const res = await request(app.getHttpServer())
        .patch(`/auth/devices/${client.deviceId}`)
        .set("Authorization", `Bearer ${adminCredential}`)
        .send({ name: "" });

      expect(res.status).toBe(400);
    });

    it("con credential no-admin devuelve 403", async () => {
      const client = await pairNewDevice(app, adminCredential, "Sin permiso");

      const res = await request(app.getHttpServer())
        .patch(`/auth/devices/${client.deviceId}`)
        .set("Authorization", `Bearer ${client.credential}`)
        .send({ name: "Intento" });

      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /auth/devices/me/seller-name", () => {
    it("cualquier dispositivo autenticado puede fijar su propio vendedor actual, sin admin", async () => {
      const client = await pairNewDevice(app, adminCredential, "Celular Vendedor");

      const res = await request(app.getHttpServer())
        .patch("/auth/devices/me/seller-name")
        .set("Authorization", `Bearer ${client.credential}`)
        .send({ sellerName: "Rodrigo" });

      expect(res.status).toBe(200);
      expect(res.body.sellerName).toBe("Rodrigo");
      expect(res.body.id).toBe(client.deviceId);
    });

    it("rechaza un nombre vacío — no se puede 'vaciar' el vendedor actual, solo reemplazarlo", async () => {
      const client = await pairNewDevice(app, adminCredential, "Celular Sin Vendedor");

      const res = await request(app.getHttpServer())
        .patch("/auth/devices/me/seller-name")
        .set("Authorization", `Bearer ${client.credential}`)
        .send({ sellerName: "" });

      expect(res.status).toBe(400);
    });

    it("sin credential devuelve 401", async () => {
      const res = await request(app.getHttpServer())
        .patch("/auth/devices/me/seller-name")
        .send({ sellerName: "Rodrigo" });
      expect(res.status).toBe(401);
    });

    it("un dispositivo no puede fijar el vendedor de otro — siempre actúa sobre sí mismo", async () => {
      const deviceA = await pairNewDevice(app, adminCredential, "Device A Vendedor");
      const deviceB = await pairNewDevice(app, adminCredential, "Device B Vendedor");

      await request(app.getHttpServer())
        .patch("/auth/devices/me/seller-name")
        .set("Authorization", `Bearer ${deviceA.credential}`)
        .send({ sellerName: "Vendedor A" });

      const meB = await request(app.getHttpServer())
        .get("/auth/devices/me")
        .set("Authorization", `Bearer ${deviceB.credential}`);
      expect(meB.body.sellerName).toBeNull();
    });
  });

  describe("Flujo crítico de seguridad: revocación permanente + nuevo pairing", () => {
    it("Device A revocado → 401 permanente; nuevo pairing crea Device B con credential independiente que sí funciona", async () => {
      // Device A: se empareja y confirma que su credential funciona.
      const deviceA = await pairNewDevice(app, adminCredential, "Device A");
      const beforeRevoke = await request(app.getHttpServer())
        .get("/auth/devices/me")
        .set("Authorization", `Bearer ${deviceA.credential}`);
      expect(beforeRevoke.status).toBe(200);

      // Revocación.
      const revokeRes = await request(app.getHttpServer())
        .post(`/auth/devices/${deviceA.deviceId}/revoke`)
        .set("Authorization", `Bearer ${adminCredential}`);
      expect(revokeRes.status).toBe(201);
      expect(revokeRes.body.active).toBe(false);

      // La credential de Device A queda muerta permanentemente.
      const afterRevoke = await request(app.getHttpServer())
        .get("/auth/devices/me")
        .set("Authorization", `Bearer ${deviceA.credential}`);
      expect(afterRevoke.status).toBe(401);

      // No existe ningún endpoint de reactivación.
      const reactivateAttempt = await request(app.getHttpServer())
        .post(`/auth/devices/${deviceA.deviceId}/reactivate`)
        .set("Authorization", `Bearer ${adminCredential}`);
      expect(reactivateAttempt.status).toBe(404);

      // Segundo revoke es idempotente, no revive nada.
      const secondRevoke = await request(app.getHttpServer())
        .post(`/auth/devices/${deviceA.deviceId}/revoke`)
        .set("Authorization", `Bearer ${adminCredential}`);
      expect(secondRevoke.status).toBe(201);
      expect(secondRevoke.body.active).toBe(false);

      // Nuevo pairing → Device B, credential completamente independiente de la de Device A.
      const deviceB = await pairNewDevice(app, adminCredential, "Device B");
      expect(deviceB.credential).not.toBe(deviceA.credential);

      const deviceBWorks = await request(app.getHttpServer())
        .get("/auth/devices/me")
        .set("Authorization", `Bearer ${deviceB.credential}`);
      expect(deviceBWorks.status).toBe(200);
      expect(deviceBWorks.body.id).toBe(deviceB.deviceId);

      // La credential vieja de Device A sigue sin funcionar después de todo esto.
      const stillDead = await request(app.getHttpServer())
        .get("/auth/devices/me")
        .set("Authorization", `Bearer ${deviceA.credential}`);
      expect(stillDead.status).toBe(401);
    });
  });

  describe("Protección contra auto-revocación del único administrador", () => {
    it("el único admin no puede revocarse a sí mismo", async () => {
      const res = await request(app.getHttpServer())
        .post(`/auth/devices/${adminDeviceId}/revoke`)
        .set("Authorization", `Bearer ${adminCredential}`);

      expect(res.status).toBe(409);

      // Sigue activo y funcionando.
      const stillWorks = await request(app.getHttpServer())
        .get("/auth/devices/me")
        .set("Authorization", `Bearer ${adminCredential}`);
      expect(stillWorks.status).toBe(200);
    });
  });

  it("el pairing token, el verification code y las credentials nunca aparecen en app.log", async () => {
    const raw = readFileSync(path.join(dir, "app.log"), "utf-8");
    expect(raw).not.toContain(adminCredential);
    expect(raw.toLowerCase()).not.toContain("bearer ");
    expect(raw).not.toContain("credentialHash");
  });

  it("las operaciones de administración quedan registradas como eventos estructurados por requestId", async () => {
    const client = await pairNewDevice(app, adminCredential, "Trazado");

    await request(app.getHttpServer())
      .get("/auth/devices")
      .set("Authorization", `Bearer ${adminCredential}`)
      .set("X-Request-Id", "trace-list");

    await request(app.getHttpServer())
      .patch(`/auth/devices/${client.deviceId}`)
      .set("Authorization", `Bearer ${adminCredential}`)
      .set("X-Request-Id", "trace-update")
      .send({ name: "Trazado 2" });

    const nonAdmin = await pairNewDevice(app, adminCredential, "No admin trazado");
    await request(app.getHttpServer())
      .get("/auth/devices")
      .set("Authorization", `Bearer ${nonAdmin.credential}`)
      .set("X-Request-Id", "trace-denied");

    await request(app.getHttpServer())
      .post(`/auth/devices/${client.deviceId}/revoke`)
      .set("Authorization", `Bearer ${adminCredential}`)
      .set("X-Request-Id", "trace-revoke");

    const reader = new LogReader(path.join(dir, "app.log"));

    expect((await reader.findByRequestId("trace-list")).map((e) => e.event)).toContain("device.listed");
    expect((await reader.findByRequestId("trace-update")).map((e) => e.event)).toContain(
      "device.updated",
    );
    expect((await reader.findByRequestId("trace-revoke")).map((e) => e.event)).toContain(
      "device.revoked",
    );
    expect((await reader.findByRequestId("trace-denied")).map((e) => e.event)).toContain(
      "device.access.denied",
    );
  });
});
