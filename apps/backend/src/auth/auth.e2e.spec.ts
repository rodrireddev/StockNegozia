import { Controller, Get, INestApplication, Req } from "@nestjs/common";
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
import { LogReader } from "../common/logger/log-reader";
import { RequestContextMiddleware } from "../common/logger/request-context.middleware";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import { createTestDb } from "../test/create-test-db";
import { AuthController } from "./auth.controller";
import { BootstrapTokenService } from "./bootstrap/bootstrap-token.service";
import { CredentialService } from "./credential/credential.service";
import { Public } from "./decorators/public.decorator";
import { DevicesRepository } from "./devices/devices.repository";
import { DevicesService } from "./devices/devices.service";
import type { RequestWithDevice } from "./guards/api-access.guard";
import { ApiAccessGuard } from "./guards/api-access.guard";

@Controller("test")
class TestController {
  @Get("protected")
  protectedRoute(@Req() req: RequestWithDevice) {
    // Expone `req.device` (poblado por `ApiAccessGuard`) para poder verificar, a nivel HTTP real,
    // qué dispositivo quedó identificado — usado por el test de trazabilidad en `development`.
    return { ok: true, device: req.device ?? null };
  }

  @Public()
  @Get("public")
  publicRoute() {
    return { ok: true };
  }
}

describe("Auth: control de acceso", () => {
  let app: INestApplication;
  let dir: string;
  let logger: AppLogger;
  let config: { accessMode: "development" | "production"; configDir: string };

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-auth-"));
    logger = new AppLogger({ level: "debug", dir, persistence: true, console: false });
    config = { accessMode: "development", configDir: path.join(dir, "config") };
    const db = createTestDb();

    const moduleRef = await Test.createTestingModule({
      controllers: [TestController, AuthController],
      providers: [
        { provide: AppLogger, useValue: logger },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
        { provide: DRIZZLE_CLIENT, useValue: db },
        DevicesRepository,
        DevicesService,
        CredentialService,
        BootstrapTokenService,
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
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("development: permite acceder a un endpoint protegido sin credential", async () => {
    const res = await request(app.getHttpServer()).get("/test/protected");
    expect(res.status).toBe(200);
    expect(res.body.device).toBeNull();
  });

  it("development: si igual viene una credential válida, identifica el dispositivo para trazabilidad — sin exigirla", async () => {
    // Registra un dispositivo directamente (no requiere `production`/bootstrap): esto reproduce
    // el caso real de Desktop, que adjunta su credential en toda request sin importar el modo.
    const { credential, deviceId } = app
      .get(DevicesService)
      .register("Electron Desktop", "desktop", { isAdmin: true });

    const res = await request(app.getHttpServer())
      .get("/test/protected")
      .set("Authorization", `Bearer ${credential}`);

    expect(res.status).toBe(200);
    expect(res.body.device).toMatchObject({ id: deviceId, name: "Electron Desktop", type: "desktop" });
  });

  it("development: una credential inválida no rompe el acceso — sigue permitiendo la request, solo sin device", async () => {
    const res = await request(app.getHttpServer())
      .get("/test/protected")
      .set("Authorization", "Bearer sn_esto-no-existe");

    expect(res.status).toBe(200);
    expect(res.body.device).toBeNull();
  });

  describe("production", () => {
    let bootstrapToken: string;
    let credential: string;
    let deviceId: string;

    beforeAll(() => {
      config.accessMode = "production";
      bootstrapToken = readFileSync(path.join(config.configDir, "bootstrap.token"), "utf-8");
    });

    afterAll(() => {
      config.accessMode = "development";
    });

    it("sin credential devuelve 401 genérico y conserva el requestId, sin revelar el motivo", async () => {
      const res = await request(app.getHttpServer())
        .get("/test/protected")
        .set("X-Request-Id", "denied-missing");
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Unauthorized");
      expect(res.body.requestId).toBe("denied-missing");
      expect(res.headers["x-request-id"]).toBe("denied-missing");
      expect(res.body).not.toHaveProperty("reason");
    });

    it("un endpoint marcado @Public() sigue siendo accesible sin credential", async () => {
      const res = await request(app.getHttpServer()).get("/test/public");
      expect(res.status).toBe(200);
    });

    it("bootstrap con el token del archivo registra el primer dispositivo y devuelve su credential", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/bootstrap")
        .send({ token: bootstrapToken, name: "Test Desktop", type: "desktop" });

      expect(res.status).toBe(201);
      expect(res.body.deviceId).toBeTruthy();
      expect(res.body.credential).toBeTruthy();

      deviceId = res.body.deviceId;
      credential = res.body.credential;
    });

    it("un token de bootstrap ya consumido no puede reutilizarse", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/bootstrap")
        .send({ token: bootstrapToken, name: "Otro dispositivo" });
      expect(res.status).toBe(401);
    });

    it("un token de bootstrap inexistente es rechazado", async () => {
      const res = await request(app.getHttpServer())
        .post("/auth/bootstrap")
        .send({ token: "sn_este-token-nunca-existio" });
      expect(res.status).toBe(401);
    });

    it("con credential válida accede al endpoint protegido", async () => {
      const res = await request(app.getHttpServer())
        .get("/test/protected")
        .set("Authorization", `Bearer ${credential}`);
      expect(res.status).toBe(200);
    });

    it("con credential inválida devuelve 401", async () => {
      const res = await request(app.getHttpServer())
        .get("/test/protected")
        .set("Authorization", "Bearer sn_credential-que-no-existe");
      expect(res.status).toBe(401);
    });

    it("un dispositivo revocado deja de poder autenticarse", async () => {
      app.get(DevicesService).revoke(deviceId);

      const res = await request(app.getHttpServer())
        .get("/test/protected")
        .set("Authorization", `Bearer ${credential}`);
      expect(res.status).toBe(401);
    });

    it("el token de bootstrap, la credential y el header Authorization nunca aparecen en app.log", async () => {
      const raw = readFileSync(path.join(dir, "app.log"), "utf-8");
      expect(raw).not.toContain(bootstrapToken);
      expect(raw).not.toContain(credential);
      expect(raw.toLowerCase()).not.toContain("bearer ");
    });

    it("los rechazos quedan registrados como eventos estructurados de auth, correlacionados por requestId", async () => {
      await request(app.getHttpServer())
        .get("/test/protected")
        .set("Authorization", "Bearer sn_otra-credential-invalida")
        .set("X-Request-Id", "trace-denied");

      const reader = new LogReader(path.join(dir, "app.log"));
      const entries = await reader.findByRequestId("trace-denied");
      const events = entries.map((e) => e.event);
      expect(events).toContain("auth.device.rejected");
    });
  });
});
