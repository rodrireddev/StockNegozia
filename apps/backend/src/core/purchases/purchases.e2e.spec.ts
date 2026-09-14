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
import { ProductsController } from "../products/products.controller";
import { ProductsRepository } from "../products/products.repository";
import { ProductsService } from "../products/products.service";
import { StockMovementsController } from "../stock-movements/stock-movements.controller";
import { StockMovementsRepository } from "../stock-movements/stock-movements.repository";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { SuppliersController } from "../suppliers/suppliers.controller";
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { SuppliersService } from "../suppliers/suppliers.service";
import { PurchasesController } from "./purchases.controller";
import { PurchasesRepository } from "./purchases.repository";
import { PurchasesService } from "./purchases.service";

/**
 * Prueba de punta a punta (HTTP real, no solo a nivel de servicio) del flujo completo de Compras
 * — ver docs/inventory/PURCHASES.md: crear proveedor, crear compra, verificar stock antes/después,
 * consultar la compra y confirmar el stock movement PURCHASE con su purchaseId/requestId.
 */
describe("Purchases: flujo HTTP completo", () => {
  let app: INestApplication;
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-purchases-e2e-"));
    const logger = new AppLogger({ level: "debug", dir, persistence: true, console: false });
    const db = createTestDb();

    const moduleRef = await Test.createTestingModule({
      controllers: [
        ProductsController,
        StockMovementsController,
        SuppliersController,
        PurchasesController,
      ],
      providers: [
        { provide: AppLogger, useValue: logger },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
        { provide: DRIZZLE_CLIENT, useValue: db },
        ProductsRepository,
        CategoriesRepository,
        CategoriesService,
        StockMovementsRepository,
        StockMovementsService,
        ProductsService,
        SuppliersRepository,
        SuppliersService,
        PurchasesRepository,
        PurchasesService,
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

  async function createSupplier(name = "ACME") {
    const res = await request(app.getHttpServer()).post("/suppliers").send({ name });
    return res.body as { id: number; name: string };
  }

  async function createProduct(stock = 10) {
    const res = await request(app.getHttpServer())
      .post("/products")
      .send({
        name: "Producto E2E",
        sku: `SKU-E2E-${Math.random().toString(36).slice(2)}`,
        purchasePrice: 100,
        salePrice: 200,
        stock,
        minimumStock: 0,
        active: true,
      });
    return res.body as { id: number; stock: number };
  }

  it("crea proveedor → crea compra → ingresa stock → consulta compra y movement, con requestId correlacionado", async () => {
    const supplier = await createSupplier("Distribuidora Norte");
    const product = await createProduct(10);

    const before = await request(app.getHttpServer()).get(`/products/${product.id}`);
    expect(before.body.stock).toBe(10);

    const createRes = await request(app.getHttpServer())
      .post("/purchases")
      .set("X-Request-Id", "e2e-purchase-1")
      .send({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 20, unitCost: 500 }],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.total).toBe(10_000);
    expect(createRes.body.supplierId).toBe(supplier.id);
    expect(createRes.body.supplierName).toBe("Distribuidora Norte");
    expect(createRes.body.items).toHaveLength(1);
    expect(createRes.body.items[0]).toMatchObject({
      productId: product.id,
      quantity: 20,
      unitCost: 500,
      subtotal: 10_000,
    });
    const purchaseId = createRes.body.id as number;

    const after = await request(app.getHttpServer()).get(`/products/${product.id}`);
    expect(after.body.stock).toBe(30);

    const getPurchase = await request(app.getHttpServer()).get(`/purchases/${purchaseId}`);
    expect(getPurchase.status).toBe(200);
    expect(getPurchase.body.items).toHaveLength(1);

    const movements = await request(app.getHttpServer()).get(
      `/products/${product.id}/stock-movements`,
    );
    expect(movements.body).toHaveLength(1);
    expect(movements.body[0]).toMatchObject({
      type: "PURCHASE",
      direction: "IN",
      quantity: 20,
      stockBefore: 10,
      stockAfter: 30,
      purchaseId,
      saleId: null,
      requestId: "e2e-purchase-1",
    });
  });

  it("GET /purchases lista las compras creadas", async () => {
    const supplier = await createSupplier();
    const product = await createProduct(5);

    await request(app.getHttpServer())
      .post("/purchases")
      .send({ supplierId: supplier.id, items: [{ productId: product.id, quantity: 1, unitCost: 10 }] });

    const list = await request(app.getHttpServer()).get("/purchases");
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThan(0);
  });

  it("POST /purchases con proveedor inexistente devuelve 404 y no modifica stock", async () => {
    const product = await createProduct(10);

    const res = await request(app.getHttpServer())
      .post("/purchases")
      .send({ supplierId: 999_999, items: [{ productId: product.id, quantity: 1, unitCost: 10 }] });

    expect(res.status).toBe(404);

    const check = await request(app.getHttpServer()).get(`/products/${product.id}`);
    expect(check.body.stock).toBe(10);
  });

  it("POST /purchases con producto inexistente devuelve 404", async () => {
    const supplier = await createSupplier();

    const res = await request(app.getHttpServer())
      .post("/purchases")
      .send({ supplierId: supplier.id, items: [{ productId: 999_999, quantity: 1, unitCost: 10 }] });

    expect(res.status).toBe(404);
  });

  it("POST /purchases sin items devuelve 400", async () => {
    const supplier = await createSupplier();

    const res = await request(app.getHttpServer())
      .post("/purchases")
      .send({ supplierId: supplier.id, items: [] });

    expect(res.status).toBe(400);
  });

  it("POST /purchases con costo negativo devuelve 400", async () => {
    const supplier = await createSupplier();
    const product = await createProduct(10);

    const res = await request(app.getHttpServer())
      .post("/purchases")
      .send({ supplierId: supplier.id, items: [{ productId: product.id, quantity: 1, unitCost: -1 }] });

    expect(res.status).toBe(400);
  });

  it("POST /purchases con producto duplicado devuelve 400 y no modifica stock", async () => {
    const supplier = await createSupplier();
    const product = await createProduct(10);

    const res = await request(app.getHttpServer())
      .post("/purchases")
      .send({
        supplierId: supplier.id,
        items: [
          { productId: product.id, quantity: 1, unitCost: 10 },
          { productId: product.id, quantity: 2, unitCost: 10 },
        ],
      });

    expect(res.status).toBe(400);

    const check = await request(app.getHttpServer()).get(`/products/${product.id}`);
    expect(check.body.stock).toBe(10);
  });

  it("GET /purchases/:id de una compra inexistente devuelve 404", async () => {
    const res = await request(app.getHttpServer()).get("/purchases/999999");
    expect(res.status).toBe(404);
  });
});
