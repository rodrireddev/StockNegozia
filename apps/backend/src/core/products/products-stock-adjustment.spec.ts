import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestContext } from "../../common/logger/request-context";
import { createSilentTestLogger } from "../../test/create-test-logger";
import { createTestDb } from "../../test/create-test-db";
import type { Database } from "../../database/database.types";
import { CategoriesRepository } from "../categories/categories.repository";
import { CategoriesService } from "../categories/categories.service";
import { PurchasesRepository } from "../purchases/purchases.repository";
import { StockMovementsRepository } from "../stock-movements/stock-movements.repository";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { SuppliersService } from "../suppliers/suppliers.service";
import { ProductsRepository } from "./products.repository";
import { ProductsService } from "./products.service";

/**
 * `POST /products/:id/stock-adjustments` — ver docs/inventory/STOCK_MOVEMENTS.md. Cubre
 * específicamente el reemplazo del antiguo `PATCH /products/:id/stock`: la API sigue siendo
 * absoluta para el cliente (`targetStock`), pero internamente todo pasa por
 * `ProductsService.adjustStock()` y genera un `stock_movement` — nunca hay una vía que modifique
 * `products.stock` sin auditoría.
 */
describe("ProductsService.applyStockAdjustment", () => {
  let db: Database;
  let productsService: ProductsService;
  let stockMovementsService: StockMovementsService;
  let stockMovementsRepository: StockMovementsRepository;
  let defaultSupplierId: number;

  beforeEach(() => {
    db = createTestDb();
    const logger = createSilentTestLogger();
    const categoriesService = new CategoriesService(new CategoriesRepository(db));
    stockMovementsRepository = new StockMovementsRepository(db);
    stockMovementsService = new StockMovementsService(stockMovementsRepository, logger);
    const suppliersService = new SuppliersService(new SuppliersRepository(db));
    productsService = new ProductsService(
      db,
      new ProductsRepository(db),
      categoriesService,
      stockMovementsService,
      suppliersService,
      new PurchasesRepository(db),
      logger,
    );
    // El proveedor es obligatorio para crear un producto con stock inicial > 0 (ver
    // ProductsService.create()) — estos tests no ejercitan proveedores en sí, solo necesitan uno
    // válido para poder fijar el stock inicial de sus productos de prueba.
    defaultSupplierId = suppliersService.create({ name: "Proveedor de prueba" }).id;
  });

  function createProduct(stock = 10) {
    return productsService.create({
      name: "Producto de prueba",
      sku: `SKU-${Math.random().toString(36).slice(2)}`,
      purchasePrice: 100,
      salePrice: 200,
      stock,
      supplierId: stock > 0 ? defaultSupplierId : undefined,
      minimumStock: 0,
      active: true,
    });
  }

  it("ajuste hacia arriba (10 → 15): actualiza el stock y crea un movement IN de quantity 5", () => {
    const product = createProduct(10);

    const updated = productsService.applyStockAdjustment(product.id, 15, "Conteo físico");
    expect(updated.stock).toBe(15);

    // 2 movimientos: el PURCHASE del stock inicial (creado al crear el producto, ver
    // products-stock-adjustment.spec.ts §creación) + el ADJUSTMENT de este test. El más reciente
    // (índice 0) es siempre el que cada test verifica.
    const movements = stockMovementsService.findByProduct(product.id);
    expect(movements).toHaveLength(2);
    expect(movements[0]).toMatchObject({
      type: "ADJUSTMENT",
      direction: "IN",
      quantity: 5,
      stockBefore: 10,
      stockAfter: 15,
      reason: "Conteo físico",
      saleId: null,
    });
  });

  it("ajuste hacia abajo (10 → 7): actualiza el stock y crea un movement OUT de quantity 3", () => {
    const product = createProduct(10);

    const updated = productsService.applyStockAdjustment(product.id, 7, "Mercadería dañada");
    expect(updated.stock).toBe(7);

    const movements = stockMovementsService.findByProduct(product.id);
    expect(movements).toHaveLength(2); // PURCHASE del stock inicial + este ADJUSTMENT
    expect(movements[0]).toMatchObject({
      type: "ADJUSTMENT",
      direction: "OUT",
      quantity: 3,
      stockBefore: 10,
      stockAfter: 7,
      reason: "Mercadería dañada",
    });
  });

  it("ajuste sin cambios (10 → 10): no modifica el stock y no crea ningún movement", () => {
    const product = createProduct(10);

    const updated = productsService.applyStockAdjustment(product.id, 10, "Conteo físico");
    expect(updated.stock).toBe(10);

    // Solo el PURCHASE del stock inicial — el "ajuste sin cambios" en sí no agrega ninguno.
    expect(stockMovementsService.findByProduct(product.id)).toHaveLength(1);
  });

  it("el motivo es obligatorio: falla si está vacío o compuesto solo por espacios", () => {
    const product = createProduct(10);

    expect(() => productsService.applyStockAdjustment(product.id, 7, "")).toThrow(
      BadRequestException,
    );
    expect(() => productsService.applyStockAdjustment(product.id, 7, "   ")).toThrow(
      BadRequestException,
    );

    // Ningún intento fallido debe haber modificado el stock ni creado un movimiento nuevo — solo
    // sigue estando el PURCHASE del stock inicial.
    expect(productsService.findById(product.id).stock).toBe(10);
    expect(stockMovementsService.findByProduct(product.id)).toHaveLength(1);
  });

  it("rechaza un stock objetivo negativo", () => {
    const product = createProduct(10);
    expect(() => productsService.applyStockAdjustment(product.id, -1, "Conteo físico")).toThrow(
      BadRequestException,
    );
    expect(productsService.findById(product.id).stock).toBe(10);
  });

  it("producto inexistente: devuelve el mismo error de dominio que el resto de Products (404)", () => {
    expect(() =>
      productsService.applyStockAdjustment(999_999, 10, "Conteo físico"),
    ).toThrow(NotFoundException);
  });

  it("atomicidad: si falla la creación del movimiento, products.stock no queda modificado", () => {
    const product = createProduct(10);

    // Simula un fallo en la creación del movimiento (independiente del motivo real de la falla)
    // para probar que la escritura de stock y el movimiento comparten la misma transacción.
    vi.spyOn(stockMovementsRepository, "insert").mockImplementation(() => {
      throw new Error("fallo simulado al crear el stock movement");
    });

    expect(() => productsService.applyStockAdjustment(product.id, 15, "Conteo físico")).toThrow();

    expect(productsService.findById(product.id).stock).toBe(10);
    // Solo el PURCHASE del stock inicial (creado antes de instalar el spy) — el ADJUSTMENT que
    // falló no dejó ningún movimiento ni cambio de stock a medias.
    expect(stockMovementsService.findByProduct(product.id)).toHaveLength(1);
  });

  it("el movement generado por un ajuste queda asociado al requestId del contexto ambiente", () => {
    const product = createProduct(10);

    RequestContext.run({ requestId: "req-adjustment-1" }, () => {
      productsService.applyStockAdjustment(product.id, 15, "Conteo físico");
    });

    const movements = stockMovementsService.findByProduct(product.id);
    expect(movements[0]!.requestId).toBe("req-adjustment-1");
  });

  it("requestId es null cuando el ajuste ocurre fuera de un contexto HTTP", () => {
    const product = createProduct(10);
    productsService.applyStockAdjustment(product.id, 15, "Conteo físico");

    const movements = stockMovementsService.findByProduct(product.id);
    expect(movements[0]!.requestId).toBeNull();
  });
});
