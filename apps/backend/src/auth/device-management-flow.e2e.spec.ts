import { Controller, Get, INestApplication } from "@nestjs/common";
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
import { AdminDeviceGuard } from "./guards/admin-device.guard";
import { ApiAccessGuard } from "./guards/api-access.guard";
import { DevicesController } from "./devices/devices.controller";
import { DevicesRepository } from "./devices/devices.repository";
import { DevicesService } from "./devices/devices.service";
import { PairingController } from "./pairing/pairing.controller";
import { PairingRepository } from "./pairing/pairing.repository";
import { PairingService } from "./pairing/pairing.service";

/**
 * Representa un recurso protegido cualquiera (`/products`, `/sales`, etc.) — no hace falta cablear
 * un módulo de negocio real acá: `ApiAccessGuard` es global, así que el comportamiento es idéntico
 * para cualquier controller no marcado `@Public()`. Mismo criterio que ya usan
 * `pairing.e2e.spec.ts` y `common/logger/http.e2e.spec.ts`.
 */
@Controller("products")
class FakeProductsController {
  @Get()
  list() {
    return [{ id: "p1", name: "Producto de prueba" }];
  }
}

interface FakeAppConfig {
  accessMode: "development" | "production";
  configDir: string;
  port: number;
  pairingExpirationMinutes: number;
  pairingHostOverride?: string;
}

/**
 * Escenario end-to-end principal de M14 (ver docs/lan/DEVICE_MANAGEMENT.md §Prueba manual):
 * pairing → device activo → consume un recurso protegido → se revoca → deja de poder acceder.
 * "PENDING" no existe en el modelo real (ver Context del plan de M14): la autorización queda
 * garantizada por la posesión del código de verificación, mostrado solo en un Desktop ya
 * autenticado — por eso el device queda `active` apenas se confirma el pairing.
 */
describe("M14: flujo completo de device management (pairing → uso → revocación)", () => {
  let app: INestApplication;
  let dir: string;
  let logger: AppLogger;
  let config: FakeAppConfig;
  let adminCredential: string;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-device-flow-"));
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
      controllers: [AuthController, PairingController, DevicesController, FakeProductsController],
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

    // 1. "Servidor inicia" — el device admin nace del bootstrap (mismo mecanismo que usa el
    // Desktop real al arrancar por primera vez), no de un seed manual de la DB.
    const bootstrapToken = readFileSync(path.join(config.configDir, "bootstrap.token"), "utf-8");
    const bootstrapRes = await request(app.getHttpServer())
      .post("/auth/bootstrap")
      .send({ token: bootstrapToken, name: "Desktop administrador", type: "desktop" });
    adminCredential = bootstrapRes.body.credential;
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("recorre el flujo completo: pairing → activo → consumo autenticado → lastSeenAt → revocación → 401", async () => {
    // 2-3. El Desktop (ya autenticado) genera un pairing para un nuevo dispositivo LAN.
    const pairing = await request(app.getHttpServer())
      .post("/auth/pairing")
      .set("Authorization", `Bearer ${adminCredential}`)
      .set("X-Request-Id", "trace-flow-pairing-create");
    expect(pairing.status).toBe(201);
    expect(pairing.body.status).toBe("pending");

    // El Desktop puede consultar el estado mientras espera confirmación.
    const statusBefore = await request(app.getHttpServer())
      .get(`/auth/pairing/${pairing.body.pairingId}`)
      .set("Authorization", `Bearer ${adminCredential}`);
    expect(statusBefore.body.status).toBe("pending");

    // 4-5. El dispositivo nuevo confirma con el QR (token) + el código de verificación → queda
    // activo y recibe su credential permanente, de una sola vez.
    const confirm = await request(app.getHttpServer())
      .post("/auth/pairing/confirm")
      .set("X-Request-Id", "trace-flow-pairing-confirm")
      .send({
        pairingId: pairing.body.pairingId,
        token: pairing.body.qr.token,
        verificationCode: pairing.body.verificationCode,
        deviceName: "Web Client LAN",
        deviceType: "web",
      });
    expect(confirm.status).toBe(201);
    const deviceCredential = confirm.body.credential as string;
    const deviceId = confirm.body.device.id as string;

    const statusAfterConfirm = await request(app.getHttpServer())
      .get(`/auth/pairing/${pairing.body.pairingId}`)
      .set("Authorization", `Bearer ${adminCredential}`);
    expect(statusAfterConfirm.body.status).toBe("confirmed");

    // El admin ve el device recién emparejado, activo, sin lastSeenAt todavía.
    const beforeUse = await request(app.getHttpServer())
      .get(`/auth/devices/${deviceId}`)
      .set("Authorization", `Bearer ${adminCredential}`);
    expect(beforeUse.body.active).toBe(true);
    expect(beforeUse.body.lastSeenAt).toBeNull();

    // 6-8. El dispositivo consulta un recurso protegido real — el backend lo identifica por su
    // deviceId (vía la credential) y actualiza lastSeenAt/lastIp (lastIp queda en el log, no en el
    // DTO — ver DEVICE_MANAGEMENT.md).
    const productsRes = await request(app.getHttpServer())
      .get("/products")
      .set("Authorization", `Bearer ${deviceCredential}`)
      .set("X-Request-Id", "trace-flow-products");
    expect(productsRes.status).toBe(200);
    expect(productsRes.body).toEqual([{ id: "p1", name: "Producto de prueba" }]);

    const afterUse = await request(app.getHttpServer())
      .get(`/auth/devices/${deviceId}`)
      .set("Authorization", `Bearer ${adminCredential}`);
    expect(afterUse.body.lastSeenAt).toBeTruthy();

    // 9. El Desktop (admin) revoca el dispositivo.
    const revoke = await request(app.getHttpServer())
      .post(`/auth/devices/${deviceId}/revoke`)
      .set("Authorization", `Bearer ${adminCredential}`)
      .set("X-Request-Id", "trace-flow-revoke");
    expect(revoke.status).toBe(201);
    expect(revoke.body.active).toBe(false);

    // 10-11. El dispositivo revocado vuelve a pedir el recurso protegido — el backend lo rechaza.
    const rejected = await request(app.getHttpServer())
      .get("/products")
      .set("Authorization", `Bearer ${deviceCredential}`)
      .set("X-Request-Id", "trace-flow-rejected");
    expect(rejected.status).toBe(401);

    // 14. Los logs permiten reconstruir cada paso por requestId, con deviceId y clientIp.
    const reader = new LogReader(path.join(dir, "app.log"));

    const productsEntries = await reader.findByRequestId("trace-flow-products");
    const productsCompleted = productsEntries.find((e) => e.event === "http.request.completed");
    expect(productsCompleted?.metadata?.deviceId).toBe(deviceId);
    expect(productsCompleted?.metadata?.clientIp).toBeTruthy();

    const rejectedEntries = await reader.findByRequestId("trace-flow-rejected");
    expect(rejectedEntries.map((e) => e.event)).toContain("http.request.failed");
    // Un request rechazado no llega a tener un device autenticado.
    const rejectedCompleted = rejectedEntries.find((e) => e.event === "http.request.failed");
    expect(rejectedCompleted?.metadata?.deviceId).toBeUndefined();

    const revokeEntries = await reader.findByRequestId("trace-flow-revoke");
    expect(revokeEntries.map((e) => e.event)).toContain("device.revoked");

    // Ni el pairing token, ni el código, ni ninguna credential aparecen nunca en el log.
    const raw = readFileSync(path.join(dir, "app.log"), "utf-8");
    expect(raw).not.toContain(pairing.body.qr.token);
    expect(raw).not.toContain(pairing.body.verificationCode);
    expect(raw).not.toContain(deviceCredential);
    expect(raw).not.toContain(adminCredential);
    expect(raw.toLowerCase()).not.toContain("bearer ");
  });
});

/**
 * `API_ACCESS_MODE=development` es el modo por defecto (ver .env.example) y no exige credential,
 * pero el Desktop igual adjunta la suya en cada request (ver el comentario en `ApiAccessGuard`)
 * para quedar identificado como actor. Ese mismo camino tiene que actualizar `lastSeenAt` — si no,
 * el propio dispositivo queda para siempre como "Todavía no se conectó" en `/auth/devices` aunque
 * esté activo y en uso.
 */
describe("M14: lastSeenAt en API_ACCESS_MODE=development", () => {
  let app: INestApplication;
  let dir: string;

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("un request autenticado en modo development también actualiza lastSeenAt", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-device-dev-mode-"));
    const logger = new AppLogger({ level: "debug", dir, persistence: true, console: false });
    const config: FakeAppConfig = {
      accessMode: "development",
      configDir: path.join(dir, "config"),
      port: 38124,
      pairingExpirationMinutes: 5,
    };
    const db = createTestDb();

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, DevicesController, FakeProductsController],
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
    const bootstrap = await request(app.getHttpServer())
      .post("/auth/bootstrap")
      .send({ token: bootstrapToken, name: "Desktop administrador", type: "desktop" });
    const adminCredential = bootstrap.body.credential as string;
    const deviceId = bootstrap.body.deviceId as string;

    // Se consulta el repo directo (no vía un endpoint protegido): cualquier request autenticado,
    // incluida la propia consulta de "estoy viendo mi lastSeenAt", también lo actualizaría.
    const repository = moduleRef.get(DevicesRepository);
    expect(repository.findById(deviceId)?.lastSeenAt).toBeNull();

    await request(app.getHttpServer()).get("/products").set("Authorization", `Bearer ${adminCredential}`);

    expect(repository.findById(deviceId)?.lastSeenAt).toBeInstanceOf(Date);
  });
});
