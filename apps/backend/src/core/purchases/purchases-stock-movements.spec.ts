import type { CreateProductInput } from "@stocknegozia/validation";
import { beforeEach, describe, expect, it } from "vitest";
import { RequestContext } from "../../common/logger/request-context";
import { createSilentTestLogger } from "../../test/create-test-logger";
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

/**
 * Integración Purchases ↔ Products.adjustStock() ↔ Stock Movements — ver
 * docs/inventory/PURCHASES.md. Mismo criterio que `sales-stock-movements.spec.ts`: cubre el
 * historial generado como efecto de crear una compra, incluida la atomicidad.
 */
describe("Purchases — integración con Stock Movements", () => {
  let db: Database;
  let productsService: ProductsService;
  let suppliersService: SuppliersService;
  let purchasesService: PurchasesService;
  let stockMovementsService: StockMovementsService;
  let defaultSupplierId: number;

  beforeEach(() => {
    db = createTestDb();
    const logger = createSilentTestLogger();
    const categoriesRepository = new CategoriesRepository(db);
    const categoriesService = new CategoriesService(categoriesRepository);
    const productsRepository = new ProductsRepository(db);
    stockMovementsService = new StockMovementsService(new StockMovementsRepository(db), logger);
    suppliersService = new SuppliersService(new SuppliersRepository(db));
    const purchasesRepository = new PurchasesRepository(db);
    productsService = new ProductsService(
      db,
      productsRepository,
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
    // El proveedor es obligatorio para crear un producto con stock inicial > 0 (ver
    // ProductsService.create()) — distinto del proveedor de `createSupplier()`, que cada test usa
    // para su propia compra real.
    defaultSupplierId = suppliersService.create({ name: "Proveedor de stock inicial" }).id;
  });

  function createProduct(overrides: Partial<CreateProductInput> = {}) {
    const stock = overrides.stock ?? 10;
    return productsService.create({
      name: "Producto de prueba",
      sku: `SKU-${Math.random().toString(36).slice(2)}`,
      purchasePrice: 500,
      salePrice: 1000,
      stock,
      supplierId: stock > 0 ? defaultSupplierId : undefined,
      minimumStock: 0,
      active: true,
      ...overrides,
    });
  }

  function createSupplier() {
    return suppliersService.create({ name: "ACME" });
  }

  describe("creación de compra", () => {
    it("10 → 15: genera un movimiento PURCHASE IN con stockBefore/stockAfter/quantity/purchaseId correctos", () => {
      const supplier = createSupplier();
      const product = createProduct({ stock: 10 });

      const purchase = purchasesService.create({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 5, unitCost: 500 }],
      });

      // 2 movimientos: el PURCHASE del stock inicial (creado al crear el producto con stock: 10,
      // ver products-initial-stock.spec.ts) + esta compra real. El más reciente (índice 0) es
      // siempre esta compra — se distingue del stock inicial por tener `purchaseId` seteado.
      const movements = stockMovementsService.findByProduct(product.id);
      expect(movements).toHaveLength(2);
      expect(movements[0]).toMatchObject({
        type: "PURCHASE",
        direction: "IN",
        quantity: 5,
        stockBefore: 10,
        stockAfter: 15,
        purchaseId: purchase.id,
        saleId: null,
      });
    });

    it("una compra con varios productos genera un movimiento por cada producto, dentro de la misma transacción", () => {
      const supplier = createSupplier();
      const productA = createProduct({ stock: 10 });
      const productB = createProduct({ stock: 5 });

      const purchase = purchasesService.create({
        supplierId: supplier.id,
        items: [
          { productId: productA.id, quantity: 20, unitCost: 500 },
          { productId: productB.id, quantity: 8, unitCost: 1200 },
        ],
      });

      // +1 cada uno por el PURCHASE del stock inicial de su propia creación.
      const movementsA = stockMovementsService.findByProduct(productA.id);
      const movementsB = stockMovementsService.findByProduct(productB.id);

      expect(movementsA).toHaveLength(2);
      expect(movementsA[0]).toMatchObject({
        type: "PURCHASE",
        stockBefore: 10,
        stockAfter: 30,
        purchaseId: purchase.id,
      });

      expect(movementsB).toHaveLength(2);
      expect(movementsB[0]).toMatchObject({
        type: "PURCHASE",
        stockBefore: 5,
        stockAfter: 13,
        purchaseId: purchase.id,
      });
    });

    it("producto inexistente: no se crea la compra, el stock no cambia, y no se crea ningún movimiento", () => {
      const supplier = createSupplier();
      const product = createProduct({ stock: 10 });

      expect(() =>
        purchasesService.create({
          supplierId: supplier.id,
          items: [
            { productId: product.id, quantity: 5, unitCost: 100 },
            { productId: 999_999, quantity: 1, unitCost: 100 },
          ],
        }),
      ).toThrow();

      expect(productsService.findById(product.id).stock).toBe(10);
      // Solo el PURCHASE del stock inicial — la compra que falló no dejó ningún movimiento nuevo.
      expect(stockMovementsService.findByProduct(product.id)).toHaveLength(1);
    });
  });

  describe("coexistencia con SALE/SALE_CANCELLATION/ADJUSTMENT", () => {
    it("un producto con historial de SALE y ADJUSTMENT también puede recibir un movimiento PURCHASE", () => {
      const supplier = createSupplier();
      const product = createProduct({ stock: 10 });

      // ADJUSTMENT
      productsService.applyStockAdjustment(product.id, 8, "Conteo físico");
      // PURCHASE
      const purchase = purchasesService.create({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 12, unitCost: 500 }],
      });

      // 3 movimientos: PURCHASE del stock inicial (más antiguo) + ADJUSTMENT + PURCHASE real (más
      // reciente). Los índices 0/1 no cambian — el nuevo movimiento queda al final (índice 2).
      const movements = stockMovementsService.findByProduct(product.id);
      expect(movements).toHaveLength(3);
      expect(movements[0]).toMatchObject({ type: "PURCHASE", stockBefore: 8, stockAfter: 20, purchaseId: purchase.id });
      expect(movements[1]).toMatchObject({ type: "ADJUSTMENT", stockBefore: 10, stockAfter: 8 });
      expect(productsService.findById(product.id).stock).toBe(20);
    });
  });

  describe("atomicidad (test crítico)", () => {
    it("caso exitoso: stock, purchase y movement quedan todos consistentes tras el commit", () => {
      const supplier = createSupplier();
      const product = createProduct({ stock: 10 });

      const purchase = purchasesService.create({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 5, unitCost: 100 }],
      });

      expect(productsService.findById(product.id).stock).toBe(15);
      expect(purchasesService.findById(purchase.id)).toBeTruthy();
      // PURCHASE del stock inicial + esta compra.
      expect(stockMovementsService.findByProduct(product.id)).toHaveLength(2);
    });

    it("caso rollback: un error antes del commit no deja stock, purchase, items ni movement — nada se crea fuera de la transacción", () => {
      const supplier = createSupplier();
      const productA = createProduct({ stock: 10 });

      expect(() =>
        purchasesService.create({
          supplierId: supplier.id,
          items: [
            { productId: productA.id, quantity: 20, unitCost: 500 },
            { productId: 999_999, quantity: 5, unitCost: 100 }, // falla después de ajustar A
          ],
        }),
      ).toThrow();

      // Stock de A vuelve al original — su adjustStock() se había aplicado lógicamente antes de
      // que el segundo item fallara.
      expect(productsService.findById(productA.id).stock).toBe(10);

      // Ninguna compra NUEVA quedó persistida — solo sigue existiendo la del stock inicial de A.
      expect(purchasesService.findMany()).toHaveLength(1);

      // Ningún movimiento quedó huérfano — solo sigue estando el PURCHASE del stock inicial.
      expect(stockMovementsService.findByProduct(productA.id)).toHaveLength(1);
    });
  });

  describe("requestId", () => {
    it("los movimientos generados por una compra quedan asociados al requestId de ese contexto", () => {
      const supplier = createSupplier();
      const product = createProduct({ stock: 10 });

      RequestContext.run({ requestId: "req-purchase-simulated" }, () => {
        purchasesService.create({
          supplierId: supplier.id,
          items: [{ productId: product.id, quantity: 5, unitCost: 100 }],
        });
      });

      // PURCHASE del stock inicial (fuera de este RequestContext, requestId null) + esta compra.
      const movements = stockMovementsService.findByProduct(product.id);
      expect(movements).toHaveLength(2);
      expect(movements[0]!.requestId).toBe("req-purchase-simulated");
    });

    it("requestId es null cuando la operación ocurre fuera de un contexto HTTP", () => {
      const supplier = createSupplier();
      const product = createProduct({ stock: 10 });

      purchasesService.create({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 5, unitCost: 100 }],
      });

      const movements = stockMovementsService.findByProduct(product.id);
      expect(movements[0]!.requestId).toBeNull();
    });
  });
});
