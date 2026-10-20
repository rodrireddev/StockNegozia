import { ConfigService } from "@nestjs/config";
import { INestApplication } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppLogger } from "../../common/logger/app-logger.service";
import { GlobalExceptionFilter } from "../../common/logger/global-exception.filter";
import { RequestContextMiddleware } from "../../common/logger/request-context.middleware";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import { createTestDb } from "../../test/create-test-db";
import { CategoriesRepository } from "../categories/categories.repository";
import { CategoriesService } from "../categories/categories.service";
import { PurchasesRepository } from "../purchases/purchases.repository";
import { StockMovementsController } from "../stock-movements/stock-movements.controller";
import { StockMovementsRepository } from "../stock-movements/stock-movements.repository";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { SuppliersService } from "../suppliers/suppliers.service";
import { ProductsController } from "./products.controller";
import { ProductsRepository } from "./products.repository";
import { ProductsService } from "./products.service";

/**
 * Prueba, a nivel HTTP real (no solo a nivel de servicio), que la ruta pública antigua
 * `PATCH /products/:id/stock` ya no existe — ver docs/inventory/STOCK_MOVEMENTS.md. No basta con
 * verificar el comportamiento del servicio: hace falta pasar por el router de Nest para demostrar
 * que no queda ninguna vía HTTP que modifique `products.stock` evitando el historial.
 */
describe("Products: sin bypass de stock por HTTP", () => {
  let app: INestApplication;
  let dir: string;
  let defaultSupplierId: number;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-products-e2e-"));
    const logger = new AppLogger({ level: "debug", dir, persistence: true, console: false });
    const db = createTestDb();

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController, StockMovementsController],
      providers: [
        { provide: AppLogger, useValue: logger },
        // ManagerDeviceGuard (roles) lo necesita; en "development" no restringe nada.
        { provide: ConfigService, useValue: { get: () => ({ accessMode: "development" }) } },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
        { provide: DRIZZLE_CLIENT, useValue: db },
        ProductsRepository,
        CategoriesRepository,
        CategoriesService,
        StockMovementsRepository,
        StockMovementsService,
        SuppliersRepository,
        SuppliersService,
        PurchasesRepository,
        ProductsService,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    const middleware = new RequestContextMiddleware(logger);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.use((req: any, res: any, next: () => void) => middleware.use(req, res, next));
    await app.init();

    // El proveedor es obligatorio para crear un producto con stock inicial > 0 (ver
    // ProductsService.create()) — no hay `SuppliersController` en este módulo de test (no es lo
    // que se está probando acá), así que se crea directamente contra el servicio.
    defaultSupplierId = moduleRef.get(SuppliersService).create({ name: "Proveedor de prueba" }).id;
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  async function createProduct(stock = 10) {
    const res = await request(app.getHttpServer())
      .post("/products")
      .send({
        name: "Producto E2E",
        sku: `SKU-E2E-${Math.random().toString(36).slice(2)}`,
        purchasePrice: 100,
        salePrice: 200,
        stock,
        supplierId: stock > 0 ? defaultSupplierId : undefined,
        minimumStock: 0,
        active: true,
      });
    return res.body as { id: number; stock: number };
  }

  it("PATCH /products/:id/stock ya no existe", async () => {
    const product = await createProduct(10);

    const res = await request(app.getHttpServer())
      .patch(`/products/${product.id}/stock`)
      .send({ stock: 999 });

    expect(res.status).toBe(404);

    // El stock no cambió — la ruta vieja ni siquiera llega a un handler.
    const check = await request(app.getHttpServer()).get(`/products/${product.id}`);
    expect(check.body.stock).toBe(10);
  });

  it("POST /products/:id/stock-adjustments ajusta el stock y genera un stock_movement auditable", async () => {
    const product = await createProduct(10);

    const res = await request(app.getHttpServer())
      .post(`/products/${product.id}/stock-adjustments`)
      .set("X-Request-Id", "e2e-adjustment-1")
      .send({ stock: 15, reason: "Conteo físico" });

    expect(res.status).toBe(201);
    expect(res.body.stock).toBe(15);

    // PURCHASE del stock inicial (creado con el producto) + este ADJUSTMENT.
    const movements = await request(app.getHttpServer()).get(
      `/products/${product.id}/stock-movements`,
    );
    expect(movements.body).toHaveLength(2);
    expect(movements.body[0]).toMatchObject({
      type: "ADJUSTMENT",
      direction: "IN",
      quantity: 5,
      stockBefore: 10,
      stockAfter: 15,
      reason: "Conteo físico",
      requestId: "e2e-adjustment-1",
    });
  });

  it("POST /products/:id/stock-adjustments sin motivo devuelve 400 y no modifica el stock", async () => {
    const product = await createProduct(10);

    const res = await request(app.getHttpServer())
      .post(`/products/${product.id}/stock-adjustments`)
      .send({ stock: 5 });

    expect(res.status).toBe(400);

    const check = await request(app.getHttpServer()).get(`/products/${product.id}`);
    expect(check.body.stock).toBe(10);
  });

  it("POST /products/:id/stock-adjustments con stock negativo devuelve 400", async () => {
    const product = await createProduct(10);

    const res = await request(app.getHttpServer())
      .post(`/products/${product.id}/stock-adjustments`)
      .send({ stock: -1, reason: "Conteo físico" });

    expect(res.status).toBe(400);
  });

  it("POST /products/:id/stock-adjustments sobre un producto inexistente devuelve 404", async () => {
    const res = await request(app.getHttpServer())
      .post("/products/999999/stock-adjustments")
      .send({ stock: 5, reason: "Conteo físico" });

    expect(res.status).toBe(404);
  });
});
