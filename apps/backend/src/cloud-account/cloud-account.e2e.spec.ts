import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppLogger } from "../common/logger/app-logger.service";
import { GlobalExceptionFilter } from "../common/logger/global-exception.filter";
import { RequestContextMiddleware } from "../common/logger/request-context.middleware";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import { createTestDb } from "../test/create-test-db";
import { AuthController } from "../auth/auth.controller";
import { BootstrapTokenService } from "../auth/bootstrap/bootstrap-token.service";
import { CredentialService } from "../auth/credential/credential.service";
import { DevicesRepository } from "../auth/devices/devices.repository";
import { DevicesService } from "../auth/devices/devices.service";
import { PairingController } from "../auth/pairing/pairing.controller";
import { PairingRepository } from "../auth/pairing/pairing.repository";
import { PairingService } from "../auth/pairing/pairing.service";
import { ApiAccessGuard } from "../auth/guards/api-access.guard";
import { CloudAccountController } from "./cloud-account.controller";
import { CloudSessionService } from "./cloud-session.service";

interface FakeAppConfig {
  accessMode: "development" | "production";
  configDir: string;
  port: number;
  pairingExpirationMinutes: number;
  cloudBackendUrl: string;
}

describe("Cloud account: proxy hacia apps/cloud-backend", () => {
  let app: INestApplication;
  let dir: string;
  let logger: AppLogger;
  let config: FakeAppConfig;
  let adminCredential: string;
  let mobileCredential: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-cloud-account-"));
    logger = new AppLogger({ level: "debug", dir, persistence: true, console: false });
    config = {
      accessMode: "production",
      configDir: path.join(dir, "config"),
      port: 38123,
      pairingExpirationMinutes: 5,
      cloudBackendUrl: "http://cloud-backend.test",
    };
    const db = createTestDb();

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, PairingController, CloudAccountController],
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
        CloudSessionService,
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

    // Dispositivo admin (desktop) — el único que puede empujar/borrar la sesión cloud.
    const bootstrapToken = readFileSync(path.join(config.configDir, "bootstrap.token"), "utf-8");
    const bootstrapRes = await request(app.getHttpServer())
      .post("/auth/bootstrap")
      .send({ token: bootstrapToken, name: "Desktop", type: "desktop" });
    adminCredential = bootstrapRes.body.credential;

    // Dispositivo mobile emparejado — nunca admin, es el que consume el proxy en uso real.
    const pairingCreated = await request(app.getHttpServer())
      .post("/auth/pairing")
      .set("Authorization", `Bearer ${adminCredential}`);
    const pairingConfirmed = await request(app.getHttpServer()).post("/auth/pairing/confirm").send({
      pairingId: pairingCreated.body.pairingId,
      token: pairingCreated.body.qr.token,
      verificationCode: pairingCreated.body.verificationCode,
      deviceName: "Celular de prueba",
      deviceType: "mobile",
    });
    mobileCredential = pairingConfirmed.body.credential;
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(async () => {
    // Cada test empieza sin sesión — evita que el estado en memoria de un test se filtre al
    // siguiente (mismo servicio singleton para toda la suite).
    await request(app.getHttpServer())
      .put("/cloud-account/session")
      .set("Authorization", `Bearer ${adminCredential}`)
      .send({ accessToken: null });
    vi.unstubAllGlobals();
  });

  describe("PUT /cloud-account/session", () => {
    it("un dispositivo no-admin no puede fijar la sesión (403)", async () => {
      const res = await request(app.getHttpServer())
        .put("/cloud-account/session")
        .set("Authorization", `Bearer ${mobileCredential}`)
        .send({ accessToken: "algun-jwt" });
      expect(res.status).toBe(403);
    });

    it("sin autenticación devuelve 401", async () => {
      const res = await request(app.getHttpServer())
        .put("/cloud-account/session")
        .send({ accessToken: "algun-jwt" });
      expect(res.status).toBe(401);
    });

    it("el dispositivo admin puede fijar y borrar la sesión, reflejado en /status", async () => {
      const set = await request(app.getHttpServer())
        .put("/cloud-account/session")
        .set("Authorization", `Bearer ${adminCredential}`)
        .send({ accessToken: "jwt-de-cuenta-cloud" });
      expect(set.status).toBe(200);
      expect(set.body).toEqual({ linked: true });

      const status = await request(app.getHttpServer())
        .get("/cloud-account/status")
        .set("Authorization", `Bearer ${mobileCredential}`);
      expect(status.body).toEqual({ linked: true });

      const clear = await request(app.getHttpServer())
        .put("/cloud-account/session")
        .set("Authorization", `Bearer ${adminCredential}`)
        .send({ accessToken: null });
      expect(clear.body).toEqual({ linked: false });
    });
  });

  describe("GET /cloud-account/status", () => {
    it("sin sesión, cualquier dispositivo autenticado ve linked: false", async () => {
      const res = await request(app.getHttpServer())
        .get("/cloud-account/status")
        .set("Authorization", `Bearer ${mobileCredential}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ linked: false });
    });
  });

  describe("reenvíos (GET /cloud-account/me, etc.)", () => {
    it("sin sesión, devuelve 404 not_linked en vez de propagar nada", async () => {
      const res = await request(app.getHttpServer())
        .get("/cloud-account/me")
        .set("Authorization", `Bearer ${mobileCredential}`);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("not_linked");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("con sesión, reenvía a cloud-backend con el bearer y devuelve la respuesta tal cual", async () => {
      await request(app.getHttpServer())
        .put("/cloud-account/session")
        .set("Authorization", `Bearer ${adminCredential}`)
        .send({ accessToken: "jwt-de-cuenta-cloud" });

      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "user-1", creditBalance: 42 }), { status: 200 }),
      );

      const res = await request(app.getHttpServer())
        .get("/cloud-account/me")
        .set("Authorization", `Bearer ${mobileCredential}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: "user-1", creditBalance: 42 });
      expect(fetchMock).toHaveBeenCalledWith(
        "http://cloud-backend.test/accounts/me",
        expect.objectContaining({ headers: expect.any(Headers) }),
      );
      const sentHeaders = fetchMock.mock.calls[0]![1].headers as Headers;
      expect(sentHeaders.get("Authorization")).toBe("Bearer jwt-de-cuenta-cloud");
    });

    it("si cloud-backend devuelve 401 (token vencido), se trata igual que sin sesión (404 not_linked)", async () => {
      await request(app.getHttpServer())
        .put("/cloud-account/session")
        .set("Authorization", `Bearer ${adminCredential}`)
        .send({ accessToken: "jwt-vencido" });

      fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));

      const res = await request(app.getHttpServer())
        .get("/cloud-account/goals/active")
        .set("Authorization", `Bearer ${mobileCredential}`);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("not_linked");
    });

    it("si cloud-backend es inalcanzable, devuelve 502 en vez de 404", async () => {
      await request(app.getHttpServer())
        .put("/cloud-account/session")
        .set("Authorization", `Bearer ${adminCredential}`)
        .send({ accessToken: "jwt-de-cuenta-cloud" });

      fetchMock.mockRejectedValueOnce(new Error("network down"));

      const res = await request(app.getHttpServer())
        .post("/cloud-account/rewarded-ad/claim")
        .set("Authorization", `Bearer ${mobileCredential}`);
      expect(res.status).toBe(502);
    });

    it("reenvía la query string de platform al pedir un ad placement", async () => {
      await request(app.getHttpServer())
        .put("/cloud-account/session")
        .set("Authorization", `Bearer ${adminCredential}`)
        .send({ accessToken: "jwt-de-cuenta-cloud" });

      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(null), { status: 200 }));

      await request(app.getHttpServer())
        .get("/cloud-account/ads/placement/rewarded_credits?platform=android")
        .set("Authorization", `Bearer ${mobileCredential}`);

      expect(fetchMock).toHaveBeenCalledWith(
        "http://cloud-backend.test/ads/placements/rewarded_credits?platform=android",
        expect.anything(),
      );
    });
  });
});
