import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppLogger } from "../../common/logger/app-logger.service";
import { LogReader } from "../../common/logger/log-reader";
import { RequestContext } from "../../common/logger/request-context";
import { createTestDb } from "../../test/create-test-db";
import type { Database } from "../../database/database.types";
import { CategoriesRepository } from "../categories/categories.repository";
import { CategoriesService } from "../categories/categories.service";
import { ProductsRepository } from "../products/products.repository";
import { ProductsService } from "../products/products.service";
import { StockMovementsRepository } from "../stock-movements/stock-movements.repository";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { SuppliersService } from "../suppliers/suppliers.service";
import { PurchasesRepository } from "./purchases.repository";
import { PurchasesService } from "./purchases.service";

describe("Purchases — secuencia de eventos de logging", () => {
  let dir: string;
  let logger: AppLogger;
  let reader: LogReader;
  let db: Database;
  let productsService: ProductsService;
  let suppliersService: SuppliersService;
  let purchasesService: PurchasesService;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-purchases-logging-"));
    logger = new AppLogger({ level: "debug", dir, persistence: true, console: false });
    reader = new LogReader(path.join(dir, "app.log"));

    db = createTestDb();
    const categoriesRepository = new CategoriesRepository(db);
    const categoriesService = new CategoriesService(categoriesRepository);
    const productsRepository = new ProductsRepository(db);
    const stockMovementsService = new StockMovementsService(new StockMovementsRepository(db), logger);
    productsService = new ProductsService(db, productsRepository, categoriesService, stockMovementsService, logger);
    suppliersService = new SuppliersService(new SuppliersRepository(db));
    const purchasesRepository = new PurchasesRepository(db);
    purchasesService = new PurchasesService(
      db,
      purchasesRepository,
      suppliersService,
      productsService,
      logger,
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function createProduct(stock = 10) {
    return productsService.create({
      name: "Producto de prueba",
      sku: `SKU-${Math.random().toString(36).slice(2)}`,
      purchasePrice: 100,
      salePrice: 200,
      stock,
      minimumStock: 0,
      active: true,
    });
  }

  function createSupplier() {
    return suppliersService.create({ name: "ACME" });
  }

  it("flujo exitoso: registra la secuencia completa correlacionada por requestId", async () => {
    const supplier = createSupplier();
    const product = createProduct(10);

    RequestContext.run({ requestId: "req-purchase-success-1" }, () => {
      purchasesService.create({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 5, unitCost: 100 }],
      });
    });

    const entries = await reader.findByRequestId("req-purchase-success-1");
    const events = entries.map((e) => e.event);

    expect(events).toEqual([
      "purchase.create.started",
      "transaction.started",
      "stock.adjust.started",
      "stock.movement.created",
      "stock.adjust.completed",
      "transaction.committed",
      "purchase.create.completed",
    ]);
    expect(entries.every((e) => e.requestId === "req-purchase-success-1")).toBe(true);
  });

  it("flujo de producto inexistente: registra started → rollback → failed", async () => {
    const supplier = createSupplier();

    RequestContext.run({ requestId: "req-purchase-not-found-1" }, () => {
      expect(() =>
        purchasesService.create({
          supplierId: supplier.id,
          items: [{ productId: 999_999, quantity: 5, unitCost: 100 }],
        }),
      ).toThrow();
    });

    const entries = await reader.findByRequestId("req-purchase-not-found-1");
    const events = entries.map((e) => e.event);

    expect(events).toEqual([
      "purchase.create.started",
      "transaction.started",
      "transaction.rollback",
      "purchase.create.failed",
    ]);

    const rollback = entries.find((e) => e.event === "transaction.rollback");
    expect(rollback?.metadata?.reason).toBe("not_found");

    const failed = entries.find((e) => e.event === "purchase.create.failed");
    expect(failed?.level).toBe("WARN"); // error de negocio conocido, no inesperado
    expect(failed?.error).toBeDefined();
  });

  it("no incluye el costo/monto de cada item en los campos de log de alto nivel de la compra", async () => {
    const supplier = createSupplier();
    const product = createProduct(10);

    RequestContext.run({ requestId: "req-purchase-no-leak-1" }, () => {
      purchasesService.create({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 5, unitCost: 100 }],
      });
    });

    const entries = await reader.findByRequestId("req-purchase-no-leak-1");
    const started = entries.find((e) => e.event === "purchase.create.started");
    // El log de alto nivel no duplica la compra completa (items con costos) — solo cuenta.
    expect(started?.metadata).toEqual({ supplierId: supplier.id, itemCount: 1 });
  });
});
