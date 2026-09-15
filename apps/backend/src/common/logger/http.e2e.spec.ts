import { Controller, Get, INestApplication, NotFoundException } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppLogger } from "./app-logger.service";
import { GlobalExceptionFilter } from "./global-exception.filter";
import { LogReader } from "./log-reader";
import { RequestContextMiddleware } from "./request-context.middleware";

@Controller("test")
class TestController {
  @Get("ok")
  ok() {
    return { ok: true };
  }

  @Get("business-error")
  businessError() {
    throw new NotFoundException("recurso de prueba no encontrado");
  }

  @Get("boom")
  boom() {
    throw new Error("boom inesperado");
  }
}

describe("HTTP: request id + exception filter", () => {
  let app: INestApplication;
  let dir: string;
  let logger: AppLogger;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-http-"));
    logger = new AppLogger({ level: "debug", dir, persistence: true, console: false });

    const moduleRef = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        { provide: AppLogger, useValue: logger },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
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

  it("genera un requestId y lo devuelve en X-Request-Id cuando el cliente no envía uno", async () => {
    const res = await request(app.getHttpServer()).get("/test/ok");
    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("respeta un X-Request-Id válido enviado por el cliente", async () => {
    const res = await request(app.getHttpServer())
      .get("/test/ok")
      .set("X-Request-Id", "client-provided-id-123");
    expect(res.headers["x-request-id"]).toBe("client-provided-id-123");
  });

  it("reemplaza un X-Request-Id inválido por uno generado", async () => {
    const res = await request(app.getHttpServer())
      .get("/test/ok")
      .set("X-Request-Id", "valor invalido con espacios!!");
    expect(res.headers["x-request-id"]).toBeTruthy();
    expect(res.headers["x-request-id"]).not.toBe("valor invalido con espacios!!");
  });

  it("un error de negocio conocido devuelve el status correcto y el requestId en el body", async () => {
    const res = await request(app.getHttpServer()).get("/test/business-error");
    expect(res.status).toBe(404);
    expect(res.body.statusCode).toBe(404);
    expect(res.body.requestId).toBeTruthy();
    expect(res.headers["x-request-id"]).toBe(res.body.requestId);
  });

  it("un error inesperado devuelve 500 con mensaje genérico, sin stack trace ni detalle interno", async () => {
    const res = await request(app.getHttpServer()).get("/test/boom");
    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Internal server error");
    expect(res.body.requestId).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain("boom inesperado");
    expect(res.body).not.toHaveProperty("stack");
  });

  it("persiste http.request.started/completed y permite reconstruir el request vía LogReader", async () => {
    const res = await request(app.getHttpServer())
      .get("/test/ok")
      .set("X-Request-Id", "trace-me-ok");
    expect(res.status).toBe(200);

    const reader = new LogReader(path.join(dir, "app.log"));
    const entries = await reader.findByRequestId("trace-me-ok");
    const events = entries.map((e) => e.event);
    expect(events).toContain("http.request.started");
    expect(events).toContain("http.request.completed");
  });

  it("registra la IP del cliente en http.request.started/completed (necesario para diagnosticar accesos LAN)", async () => {
    const res = await request(app.getHttpServer())
      .get("/test/ok")
      .set("X-Request-Id", "trace-me-client-ip");
    expect(res.status).toBe(200);

    const reader = new LogReader(path.join(dir, "app.log"));
    const entries = await reader.findByRequestId("trace-me-client-ip");
    const started = entries.find((e) => e.event === "http.request.started");
    const completed = entries.find((e) => e.event === "http.request.completed");
    expect(started?.metadata?.clientIp).toBeTruthy();
    expect(completed?.metadata?.clientIp).toBeTruthy();
    expect(started?.metadata?.clientIp).toBe(completed?.metadata?.clientIp);
  });

  it("un error inesperado queda registrado como http.unhandled_exception con stack en el log interno", async () => {
    const res = await request(app.getHttpServer())
      .get("/test/boom")
      .set("X-Request-Id", "trace-me-boom");
    expect(res.status).toBe(500);

    const reader = new LogReader(path.join(dir, "app.log"));
    const entries = await reader.findByRequestId("trace-me-boom");
    const unhandled = entries.find((e) => e.event === "http.unhandled_exception");
    expect(unhandled).toBeDefined();
    expect(unhandled?.level).toBe("ERROR");
    expect(unhandled?.error?.stack).toBeTruthy();

    const failedHttp = entries.find((e) => e.event === "http.request.failed");
    expect(failedHttp).toBeDefined();
  });
});
