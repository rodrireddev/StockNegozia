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
import { StockMovementsRepository } from "../stock-movements/stock-movements.repository";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { SuppliersService } from "../suppliers/suppliers.service";
import { ProductsController } from "./products.controller";
import { ProductsRepository } from "./products.repository";
import { ProductsService } from "./products.service";

/**
 * Cubre el lookup exacto de scanner (`GET /products/lookup`, M16) y la validación de unicidad de
 * `barcode` que ese endpoint necesita para ser confiable — ver docs/inventory/PRODUCT_SCANNER.md.
 * Mismo bootstrap de módulo que `products.e2e.spec.ts`.
 */
describe("Products: scanner (lookup + unicidad de barcode)", () => {
  let app: INestApplication;
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-products-scanner-e2e-"));
    const logger = new AppLogger({ level: "debug", dir, persistence: true, console: false });
    const db = createTestDb();

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
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
  });

  afterAll(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  function uniqueSku() {
    return `SKU-SCAN-${Math.random().toString(36).slice(2)}`;
  }

  async function createProduct(overrides: Record<string, unknown> = {}) {
    const res = await request(app.getHttpServer())
      .post("/products")
      .send({
        name: "Producto Scanner",
        sku: uniqueSku(),
        purchasePrice: 100,
        salePrice: 200,
        stock: 0,
        minimumStock: 0,
        active: true,
        ...overrides,
      });
    return res;
  }

  describe("GET /products/lookup", () => {
    it("encuentra un producto por sku exacto", async () => {
      const created = await createProduct();
      expect(created.status).toBe(201);

      const res = await request(app.getHttpServer()).get("/products/lookup").query({
        code: created.body.sku,
      });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it("encuentra un producto por barcode exacto", async () => {
      const barcode = `779${Math.floor(Math.random() * 1_000_000_000)}`;
      const created = await createProduct({ barcode });
      expect(created.status).toBe(201);

      const res = await request(app.getHttpServer())
        .get("/products/lookup")
        .query({ code: barcode });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it("desenvuelve el prefijo reservado STOCKNEGOZIA:PRODUCT: y resuelve por el resto del código", async () => {
      const created = await createProduct();
      expect(created.status).toBe(201);

      const res = await request(app.getHttpServer())
        .get("/products/lookup")
        .query({ code: `STOCKNEGOZIA:PRODUCT:${created.body.sku}` });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it("no hace match parcial: un código que es substring de un sku/barcode no encuentra nada", async () => {
      await createProduct({ barcode: "7791234567890" });

      const res = await request(app.getHttpServer())
        .get("/products/lookup")
        .query({ code: "123456" });

      expect(res.status).toBe(404);
    });

    it("devuelve 404 para un código que no pertenece a ningún producto", async () => {
      const res = await request(app.getHttpServer())
        .get("/products/lookup")
        .query({ code: "NO-EXISTE-999" });

      expect(res.status).toBe(404);
    });

    it("devuelve 400 si falta el parámetro code", async () => {
      const res = await request(app.getHttpServer()).get("/products/lookup");
      expect(res.status).toBe(400);
    });

    it("GET /products/:id numérico sigue funcionando (la ruta /lookup no lo intercepta)", async () => {
      const created = await createProduct();
      const res = await request(app.getHttpServer()).get(`/products/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });
  });

  describe("Unicidad de barcode", () => {
    it("rechaza crear un producto con un barcode ya usado por otro producto", async () => {
      const barcode = `EAN-${Math.random().toString(36).slice(2)}`;
      const first = await createProduct({ barcode });
      expect(first.status).toBe(201);

      const second = await createProduct({ barcode });
      expect(second.status).toBe(409);
      expect(second.body.message).toContain(first.body.name);
    });

    it("rechaza actualizar un producto con el barcode de otro producto", async () => {
      const barcode = `EAN-${Math.random().toString(36).slice(2)}`;
      const owner = await createProduct({ barcode });
      const other = await createProduct();
      expect(owner.status).toBe(201);
      expect(other.status).toBe(201);

      const res = await request(app.getHttpServer())
        .patch(`/products/${other.body.id}`)
        .send({ barcode });

      expect(res.status).toBe(409);
    });

    it("permite crear varios productos sin barcode (NULL no cuenta como duplicado)", async () => {
      const first = await createProduct();
      const second = await createProduct();
      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
    });

    it("permite actualizar un producto reenviando su propio barcode sin cambios", async () => {
      const barcode = `EAN-${Math.random().toString(36).slice(2)}`;
      const created = await createProduct({ barcode });
      expect(created.status).toBe(201);

      const res = await request(app.getHttpServer())
        .patch(`/products/${created.body.id}`)
        .send({ barcode, name: "Producto Scanner Renombrado" });

      expect(res.status).toBe(200);
      expect(res.body.barcode).toBe(barcode);
    });
  });
});
