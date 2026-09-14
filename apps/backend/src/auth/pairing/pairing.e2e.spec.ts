import { Controller, Get, INestApplication } from "@nestjs/common";
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
import { Public } from "../decorators/public.decorator";
import { DevicesRepository } from "../devices/devices.repository";
import { DevicesService } from "../devices/devices.service";
import { ApiAccessGuard } from "../guards/api-access.guard";
import { PairingController } from "./pairing.controller";
import { PairingRepository } from "./pairing.repository";
import { PairingService } from "./pairing.service";

@Controller("test")
class TestController {
  @Get("protected")
  protectedRoute() {
    return { ok: true };
  }

  @Public()
  @Get("public")
  publicRoute() {
    return { ok: true };
  }
}

interface FakeAppConfig {
  accessMode: "development" | "production";
  configDir: string;
  port: number;
  pairingExpirationMinutes: number;
  pairingHostOverride?: string;
}

describe("Pairing: QR + código de verificación", () => {
  let app: INestApplication;
  let dir: string;
  let logger: AppLogger;
  let config: FakeAppConfig;
  let deviceCredential: string;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-pairing-"));
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
      controllers: [TestController, AuthController, PairingController],
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

    // Bootstrap del primer dispositivo — necesitamos una credential válida para poder crear
    // pairings (POST /auth/pairing exige autenticación, ver docs/security/PAIRING.md).
    const bootstrapToken = readFileSync(path.join(config.configDir, "bootstrap.token"), "utf-8");
    const bootstrapRes = await request(app.getHttpServer())
      .post("/auth/bootstrap")
      .send({ token: bootstrapToken, name: "Desktop autenticado", type: "desktop" });
    deviceCredential = bootstrapRes.body.credential;
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("crear un pairing sin autenticación devuelve 401", async () => {
    const res = await request(app.getHttpServer()).post("/auth/pairing");
    expect(res.status).toBe(401);
  });

  it("crear un pairing con credential válida devuelve un payload de QR y un código de verificación", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/pairing")
      .set("Authorization", `Bearer ${deviceCredential}`);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
    expect(res.body.verificationCode).toMatch(/^\d{6}$/);
    expect(res.body.qr).toMatchObject({
      version: 1,
      type: "stocknegozia-pairing",
      host: "192.168.1.50",
      port: 38123,
      protocol: "http",
      pairingId: res.body.pairingId,
    });
    // El token del QR nunca es la credential permanente de ningún dispositivo.
    expect(res.body.qr.token).not.toBe(deviceCredential);
    expect(res.body).not.toHaveProperty("credential");
  });

  describe("confirmación", () => {
    it("confirmar con un token incorrecto devuelve 401 genérico", async () => {
      const created = await request(app.getHttpServer())
        .post("/auth/pairing")
        .set("Authorization", `Bearer ${deviceCredential}`);

      const res = await request(app.getHttpServer()).post("/auth/pairing/confirm").send({
        pairingId: created.body.pairingId,
        token: "sn_token-incorrecto-pero-largo-igual",
        verificationCode: created.body.verificationCode,
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
    });

    it("confirmar con un código de verificación incorrecto devuelve 401 genérico", async () => {
      const created = await request(app.getHttpServer())
        .post("/auth/pairing")
        .set("Authorization", `Bearer ${deviceCredential}`);

      const res = await request(app.getHttpServer()).post("/auth/pairing/confirm").send({
        pairingId: created.body.pairingId,
        token: created.body.qr.token,
        verificationCode: "000000",
      });

      expect(res.status).toBe(401);
    });

    it("confirmar un pairingId inexistente devuelve el mismo 401 genérico (no revela si existe)", async () => {
      const res = await request(app.getHttpServer()).post("/auth/pairing/confirm").send({
        pairingId: "00000000-0000-0000-0000-000000000000",
        token: "sn_cualquier-cosa-de-mas-de-16-chars",
        verificationCode: "123456",
      });
      expect(res.status).toBe(401);
    });

    it("confirmar con datos correctos crea un device nuevo y devuelve su credential una sola vez", async () => {
      const created = await request(app.getHttpServer())
        .post("/auth/pairing")
        .set("Authorization", `Bearer ${deviceCredential}`);

      const res = await request(app.getHttpServer()).post("/auth/pairing/confirm").send({
        pairingId: created.body.pairingId,
        token: created.body.qr.token,
        verificationCode: created.body.verificationCode,
        deviceName: "Juan Android",
        deviceType: "mobile",
      });

      expect(res.status).toBe(201);
      expect(res.body.device.name).toBe("Juan Android");
      expect(res.body.device.type).toBe("mobile");
      expect(res.body.credential).toBeTruthy();
    });

    it("un pairing ya confirmado no puede reutilizarse", async () => {
      const created = await request(app.getHttpServer())
        .post("/auth/pairing")
        .set("Authorization", `Bearer ${deviceCredential}`);

      const confirmBody = {
        pairingId: created.body.pairingId,
        token: created.body.qr.token,
        verificationCode: created.body.verificationCode,
      };

      const first = await request(app.getHttpServer()).post("/auth/pairing/confirm").send(confirmBody);
      expect(first.status).toBe(201);

      const second = await request(app.getHttpServer()).post("/auth/pairing/confirm").send(confirmBody);
      expect(second.status).toBe(401);
    });

    it("un pairing expirado no puede confirmarse", async () => {
      config.pairingExpirationMinutes = 1 / 60_000; // ~1ms — expira casi de inmediato
      const created = await request(app.getHttpServer())
        .post("/auth/pairing")
        .set("Authorization", `Bearer ${deviceCredential}`);
      config.pairingExpirationMinutes = 5;

      await new Promise((resolve) => setTimeout(resolve, 50));

      const res = await request(app.getHttpServer()).post("/auth/pairing/confirm").send({
        pairingId: created.body.pairingId,
        token: created.body.qr.token,
        verificationCode: created.body.verificationCode,
      });
      expect(res.status).toBe(401);
    });
  });

  describe("cancelación", () => {
    it("cancelar un pairing PENDING impide confirmarlo después", async () => {
      const created = await request(app.getHttpServer())
        .post("/auth/pairing")
        .set("Authorization", `Bearer ${deviceCredential}`);

      const cancelRes = await request(app.getHttpServer())
        .post("/auth/pairing/cancel")
        .set("Authorization", `Bearer ${deviceCredential}`)
        .send({ pairingId: created.body.pairingId });
      expect(cancelRes.status).toBe(201);

      const confirmRes = await request(app.getHttpServer()).post("/auth/pairing/confirm").send({
        pairingId: created.body.pairingId,
        token: created.body.qr.token,
        verificationCode: created.body.verificationCode,
      });
      expect(confirmRes.status).toBe(401);
    });

    it("cancelar sin autenticación devuelve 401", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/pairing/cancel")
        .send({ pairingId: "cualquiera" });
      expect(res.status).toBe(401);
    });
  });

  describe("integración con ApiAccessGuard", () => {
    let pairedCredential: string;
    let pairedDeviceId: string;

    beforeAll(async () => {
      const created = await request(app.getHttpServer())
        .post("/auth/pairing")
        .set("Authorization", `Bearer ${deviceCredential}`);

      const confirmed = await request(app.getHttpServer()).post("/auth/pairing/confirm").send({
        pairingId: created.body.pairingId,
        token: created.body.qr.token,
        verificationCode: created.body.verificationCode,
        deviceName: "Notebook de prueba",
        deviceType: "desktop",
      });

      pairedCredential = confirmed.body.credential;
      pairedDeviceId = confirmed.body.device.id;
    });

    it("la credential de un dispositivo emparejado por QR funciona exactamente igual que cualquier otro device autenticado", async () => {
      const res = await request(app.getHttpServer())
        .get("/test/protected")
        .set("Authorization", `Bearer ${pairedCredential}`);
      expect(res.status).toBe(200);
    });

    it("al revocar ese device, su credential deja de funcionar", async () => {
      app.get(DevicesService).revoke(pairedDeviceId);

      const res = await request(app.getHttpServer())
        .get("/test/protected")
        .set("Authorization", `Bearer ${pairedCredential}`);
      expect(res.status).toBe(401);
    });
  });

  it("el pairing token, el verification code y la credential nunca aparecen en app.log", async () => {
    const created = await request(app.getHttpServer())
      .post("/auth/pairing")
      .set("Authorization", `Bearer ${deviceCredential}`);

    const confirmed = await request(app.getHttpServer()).post("/auth/pairing/confirm").send({
      pairingId: created.body.pairingId,
      token: created.body.qr.token,
      verificationCode: created.body.verificationCode,
    });

    const raw = readFileSync(path.join(dir, "app.log"), "utf-8");
    expect(raw).not.toContain(created.body.qr.token);
    expect(raw).not.toContain(created.body.verificationCode);
    expect(raw).not.toContain(confirmed.body.credential);
    expect(raw.toLowerCase()).not.toContain("bearer ");
  });

  it("las operaciones de pairing quedan registradas como eventos estructurados, correlacionadas por requestId", async () => {
    const created = await request(app.getHttpServer())
      .post("/auth/pairing")
      .set("Authorization", `Bearer ${deviceCredential}`)
      .set("X-Request-Id", "trace-pairing-create");
    expect(created.status).toBe(201);

    await request(app.getHttpServer())
      .post("/auth/pairing/confirm")
      .set("X-Request-Id", "trace-pairing-confirm")
      .send({
        pairingId: created.body.pairingId,
        token: created.body.qr.token,
        verificationCode: created.body.verificationCode,
      });

    const reader = new LogReader(path.join(dir, "app.log"));

    const createEntries = await reader.findByRequestId("trace-pairing-create");
    expect(createEntries.map((e) => e.event)).toContain("pairing.created");

    const confirmEntries = await reader.findByRequestId("trace-pairing-confirm");
    const confirmEvents = confirmEntries.map((e) => e.event);
    expect(confirmEvents).toContain("pairing.confirmation.started");
    expect(confirmEvents).toContain("pairing.confirmed");
    expect(confirmEvents).toContain("device.created");
  });
});
