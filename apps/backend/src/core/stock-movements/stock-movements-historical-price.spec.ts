import type { CreateProductInput } from "@stocknegozia/validation";
import { beforeEach, describe, expect, it } from "vitest";
import { createSilentTestLogger } from "../../test/create-test-logger";
import { createTestDb } from "../../test/create-test-db";
import type { Database } from "../../database/database.types";
import { CategoriesRepository } from "../categories/categories.repository";
import { CategoriesService } from "../categories/categories.service";
import { ProductsRepository } from "../products/products.repository";
import { ProductsService } from "../products/products.service";
import { PurchasesRepository } from "../purchases/purchases.repository";
import { PurchasesService } from "../purchases/purchases.service";
import { SalesRepository } from "../sales/sales.repository";
import { SalesService } from "../sales/sales.service";
import { SettingsRepository } from "../settings/settings.repository";
import { SettingsService } from "../settings/settings.service";
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { SuppliersService } from "../suppliers/suppliers.service";
import { StockMovementsRepository } from "./stock-movements.repository";
import { StockMovementsService } from "./stock-movements.service";

/**
 * M11.5 — el precio/costo mostrado en un movimiento debe representar el valor real de esa
 * operación en el momento en que ocurrió, resuelto vía `sale_items.unitPrice`/
 * `purchase_items.unitCost` (inmutables una vez creados) — nunca desde `products.salePrice`/
 * `purchasePrice` (que sí cambian). Ver docs/inventory/STOCK_MOVEMENTS.md §Precio histórico.
 */
describe("Stock movements — precio histórico", () => {
  let db: Database;
  let productsService: ProductsService;
  let suppliersService: SuppliersService;
  let purchasesService: PurchasesService;
  let salesService: SalesService;
  let stockMovementsService: StockMovementsService;
  let defaultSupplierId: number;

  beforeEach(() => {
    db = createTestDb();
    const logger = createSilentTestLogger();
    const categoriesService = new CategoriesService(new CategoriesRepository(db));
    stockMovementsService = new StockMovementsService(new StockMovementsRepository(db), logger);
    suppliersService = new SuppliersService(new SuppliersRepository(db));
    const purchasesRepository = new PurchasesRepository(db);
    productsService = new ProductsService(
      db,
      new ProductsRepository(db),
      categoriesService,
      stockMovementsService,
      suppliersService,
      purchasesRepository,
      logger,
    );
    purchasesService = new PurchasesService(
      db,
      purchasesRepository,
      suppliersService,
      productsService,
      logger,
    );
    const settingsService = new SettingsService(new SettingsRepository(db));
    salesService = new SalesService(
      db,
      new SalesRepository(db),
      productsService,
      settingsService,
      logger,
    );
    // El proveedor es obligatorio para crear un producto con stock inicial > 0 (ver
    // ProductsService.create()) — distinto del proveedor de `createSupplier()`, que los tests de
    // Purchases usan para sus propias compras.
    defaultSupplierId = suppliersService.create({ name: "Proveedor de stock inicial" }).id;
  });

  function createProduct(overrides: Partial<CreateProductInput> = {}) {
    const stock = overrides.stock ?? 0;
    return productsService.create({
      name: "Coca-Cola 500ml",
      sku: `SKU-${Math.random().toString(36).slice(2)}`,
      purchasePrice: 850,
      salePrice: 1200,
      stock,
      supplierId: stock > 0 ? defaultSupplierId : undefined,
      minimumStock: 0,
      active: true,
      ...overrides,
    });
  }

  function createSupplier() {
    return suppliersService.create({ name: "Distribuidora Sur" });
  }

  function movementsFor(productId: number) {
    return stockMovementsService.findByProduct(productId);
  }

  it("Caso 1 — una compra conserva su costo histórico aunque cambie el precio actual del producto", () => {
    const supplier = createSupplier();
    const product = createProduct({ purchasePrice: 500 });

    purchasesService.create({
      supplierId: supplier.id,
      items: [{ productId: product.id, quantity: 10, unitCost: 500 }],
    });

    const [movement] = movementsFor(product.id);
    expect(movement!.type).toBe("PURCHASE");
    expect(movement!.unitValue).toBe(500);

    // Cambiar el precio de compra ACTUAL del producto no debe afectar el movimiento ya registrado.
    productsService.update(product.id, { purchasePrice: 950 });

    const [movementAfterPriceChange] = movementsFor(product.id);
    expect(movementAfterPriceChange!.unitValue).toBe(500);
  });

  it("Caso 2 — una venta conserva su precio histórico aunque cambie el precio de venta actual", () => {
    const product = createProduct({ salePrice: 1000, stock: 10 });

    salesService.create({ items: [{ productId: product.id, quantity: 1 }] });

    const [movement] = movementsFor(product.id);
    expect(movement!.type).toBe("SALE");
    expect(movement!.unitValue).toBe(1000);

    productsService.update(product.id, { salePrice: 1500 });

    const [movementAfterPriceChange] = movementsFor(product.id);
    expect(movementAfterPriceChange!.unitValue).toBe(1000);
  });

  it("Caso 3 — un ajuste manual no tiene precio de operación (unitValue null, nunca 0 ni inventado)", () => {
    const product = createProduct({ stock: 10 });

    productsService.applyStockAdjustment(product.id, 8, "Conteo físico");

    const [movement] = movementsFor(product.id);
    expect(movement!.type).toBe("ADJUSTMENT");
    expect(movement!.unitValue).toBeNull();
  });

  it("Caso 4 — varias compras del mismo producto conservan cada una su propio costo", () => {
    const supplier = createSupplier();
    const product = createProduct({ stock: 0 });

    purchasesService.create({
      supplierId: supplier.id,
      items: [{ productId: product.id, quantity: 5, unitCost: 500 }],
    });
    purchasesService.create({
      supplierId: supplier.id,
      items: [{ productId: product.id, quantity: 5, unitCost: 600 }],
    });
    purchasesService.create({
      supplierId: supplier.id,
      items: [{ productId: product.id, quantity: 5, unitCost: 750 }],
    });

    const movements = movementsFor(product.id); // más reciente primero
    expect(movements.map((m) => m.unitValue)).toEqual([750, 600, 500]);
  });

  it("Caso 5 — varias ventas del mismo producto conservan cada una su propio precio", () => {
    const product = createProduct({ stock: 100 });

    salesService.create({ items: [{ productId: product.id, quantity: 1 }] }); // precio actual: 1200
    productsService.update(product.id, { salePrice: 1100 });
    salesService.create({ items: [{ productId: product.id, quantity: 1 }] }); // precio actual: 1100
    productsService.update(product.id, { salePrice: 1000 });
    salesService.create({ items: [{ productId: product.id, quantity: 1 }] }); // precio actual: 1000

    // Se filtra a solo los movimientos SALE: `createProduct({ stock: 100 })` también deja su
    // propio movimiento PURCHASE (stock inicial), que rompería la comparación posicional de este
    // test si no se excluyera.
    const movements = movementsFor(product.id) // más reciente primero
      .filter((m) => m.type === "SALE");
    expect(movements.map((m) => m.unitValue)).toEqual([1000, 1100, 1200]);
  });

  it("caso adicional — una cancelación de venta conserva el precio de la venta original que cancela", () => {
    const product = createProduct({ salePrice: 1200, stock: 10 });
    const sale = salesService.create({ items: [{ productId: product.id, quantity: 2 }] });

    productsService.update(product.id, { salePrice: 1500 });
    salesService.cancel(sale.id);

    const movements = movementsFor(product.id);
    const cancellation = movements.find((m) => m.type === "SALE_CANCELLATION");
    expect(cancellation?.unitValue).toBe(1200);
  });
});
