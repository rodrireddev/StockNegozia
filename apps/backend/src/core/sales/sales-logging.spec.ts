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
import { SalesRepository } from "./sales.repository";
import { SalesService } from "./sales.service";

describe("Sales — secuencia de eventos de logging", () => {
  let dir: string;
  let logger: AppLogger;
  let reader: LogReader;
  let db: Database;
  let productsService: ProductsService;
  let salesService: SalesService;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "stocknegozia-sales-logging-"));
    logger = new AppLogger({ level: "debug", dir, persistence: true, console: false });
    reader = new LogReader(path.join(dir, "app.log"));

    db = createTestDb();
    const categoriesRepository = new CategoriesRepository(db);
    const categoriesService = new CategoriesService(categoriesRepository);
    const productsRepository = new ProductsRepository(db);
    productsService = new ProductsService(productsRepository, categoriesService, logger);
    const salesRepository = new SalesRepository(db);
    salesService = new SalesService(db, salesRepository, productsService, logger);
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

  it("flujo exitoso: registra la secuencia completa correlacionada por requestId", async () => {
    const product = createProduct(10);

    RequestContext.run({ requestId: "req-success-1" }, () => {
      salesService.create({ items: [{ productId: product.id, quantity: 2 }] });
    });

    const entries = await reader.findByRequestId("req-success-1");
    const events = entries.map((e) => e.event);

    expect(events).toEqual([
      "sale.create.started",
      "transaction.started",
      "stock.adjust.started",
      "stock.adjust.completed",
      "transaction.committed",
      "sale.create.completed",
    ]);
    expect(entries.every((e) => e.requestId === "req-success-1")).toBe(true);
  });

  it("flujo de stock insuficiente: registra started → insufficient → rollback → failed", async () => {
    const product = createProduct(1);

    RequestContext.run({ requestId: "req-insufficient-1" }, () => {
      expect(() =>
        salesService.create({ items: [{ productId: product.id, quantity: 5 }] }),
      ).toThrow();
    });

    const entries = await reader.findByRequestId("req-insufficient-1");
    const events = entries.map((e) => e.event);

    expect(events).toEqual([
      "sale.create.started",
      "transaction.started",
      "stock.adjust.started",
      "stock.insufficient",
      "stock.adjust.failed",
      "transaction.rollback",
      "sale.create.failed",
    ]);

    const rollback = entries.find((e) => e.event === "transaction.rollback");
    expect(rollback?.metadata?.reason).toBe("insufficient_stock");

    const failed = entries.find((e) => e.event === "sale.create.failed");
    expect(failed?.level).toBe("WARN"); // error de negocio conocido, no inesperado
    expect(failed?.error).toBeDefined();

    // el stock no debe haber cambiado
    expect(productsService.findById(product.id).stock).toBe(1);
  });

  it("cancelación: registra started → restauración de stock → committed → completed", async () => {
    const product = createProduct(10);
    let saleId!: number;

    RequestContext.run({ requestId: "req-create-for-cancel" }, () => {
      const sale = salesService.create({ items: [{ productId: product.id, quantity: 4 }] });
      saleId = sale.id;
    });

    RequestContext.run({ requestId: "req-cancel-1" }, () => {
      salesService.cancel(saleId);
    });

    const entries = await reader.findByRequestId("req-cancel-1");
    const events = entries.map((e) => e.event);

    expect(events).toEqual([
      "sale.cancel.started",
      "transaction.started",
      "stock.adjust.started",
      "stock.adjust.completed",
      "transaction.committed",
      "sale.cancel.completed",
    ]);
    expect(productsService.findById(product.id).stock).toBe(10);
  });
});
