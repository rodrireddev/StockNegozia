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
import { SalesRepository } from "./sales.repository";
import { SalesService } from "./sales.service";

/**
 * Integración Sales ↔ Products.adjustStock() ↔ Stock Movements — ver
 * docs/inventory/STOCK_MOVEMENTS.md. `sales.service.spec.ts` cubre el comportamiento de Sales en
 * sí mismo (ya probado y sin cambios de comportamiento); este archivo cubre específicamente el
 * historial que ahora se genera como efecto de esas mismas operaciones, incluida la atomicidad.
 */
describe("Sales — integración con Stock Movements", () => {
  let db: Database;
  let productsService: ProductsService;
  let salesService: SalesService;
  let stockMovementsService: StockMovementsService;

  beforeEach(() => {
    db = createTestDb();
    const logger = createSilentTestLogger();
    const categoriesRepository = new CategoriesRepository(db);
    const categoriesService = new CategoriesService(categoriesRepository);
    const productsRepository = new ProductsRepository(db);
    stockMovementsService = new StockMovementsService(new StockMovementsRepository(db), logger);
    productsService = new ProductsService(db, productsRepository, categoriesService, stockMovementsService, logger);
    const salesRepository = new SalesRepository(db);
    salesService = new SalesService(db, salesRepository, productsService, logger);
  });

  function createProduct(overrides: Partial<CreateProductInput> = {}) {
    return productsService.create({
      name: "Producto de prueba",
      sku: `SKU-${Math.random().toString(36).slice(2)}`,
      purchasePrice: 5000,
      salePrice: 10000,
      stock: 10,
      minimumStock: 0,
      active: true,
      ...overrides,
    });
  }

  describe("creación de venta", () => {
    it("20 → 17: genera un movimiento SALE OUT con stockBefore/stockAfter/quantity correctos", () => {
      const product = createProduct({ stock: 20 });

      const sale = salesService.create({ items: [{ productId: product.id, quantity: 3 }] });

      const movements = stockMovementsService.findByProduct(product.id);
      expect(movements).toHaveLength(1);
      expect(movements[0]).toMatchObject({
        type: "SALE",
        direction: "OUT",
        quantity: 3,
        stockBefore: 20,
        stockAfter: 17,
        saleId: sale.id,
      });
    });

    it("una venta con varios productos genera un movimiento por cada producto, dentro de la misma transacción", () => {
      const productA = createProduct({ stock: 10 });
      const productB = createProduct({ stock: 5 });

      const sale = salesService.create({
        items: [
          { productId: productA.id, quantity: 3 },
          { productId: productB.id, quantity: 2 },
        ],
      });

      const movementsA = stockMovementsService.findByProduct(productA.id);
      const movementsB = stockMovementsService.findByProduct(productB.id);

      expect(movementsA).toHaveLength(1);
      expect(movementsA[0]).toMatchObject({ stockBefore: 10, stockAfter: 7, saleId: sale.id });

      expect(movementsB).toHaveLength(1);
      expect(movementsB[0]).toMatchObject({ stockBefore: 5, stockAfter: 3, saleId: sale.id });
    });

    it("stock insuficiente: no se crea la venta, el stock no cambia, y no se crea ningún movimiento", () => {
      const product = createProduct({ stock: 2 });

      expect(() =>
        salesService.create({ items: [{ productId: product.id, quantity: 5 }] }),
      ).toThrow();

      expect(productsService.findById(product.id).stock).toBe(2);
      expect(stockMovementsService.findByProduct(product.id)).toHaveLength(0);
    });
  });

  describe("cancelación de venta", () => {
    it("genera un movimiento SALE_CANCELLATION IN nuevo, sin tocar el movimiento SALE original", () => {
      const product = createProduct({ stock: 20 });
      const sale = salesService.create({ items: [{ productId: product.id, quantity: 3 }] });

      salesService.cancel(sale.id);

      const movements = stockMovementsService.findByProduct(product.id);
      expect(movements).toHaveLength(2);

      // Más reciente primero: la cancelación.
      expect(movements[0]).toMatchObject({
        type: "SALE_CANCELLATION",
        direction: "IN",
        quantity: 3,
        stockBefore: 17,
        stockAfter: 20,
        saleId: sale.id,
      });

      // El movimiento original de la venta sigue existiendo, sin modificar.
      expect(movements[1]).toMatchObject({
        type: "SALE",
        direction: "OUT",
        quantity: 3,
        stockBefore: 20,
        stockAfter: 17,
        saleId: sale.id,
      });

      expect(productsService.findById(product.id).stock).toBe(20);
    });
  });

  describe("atomicidad (test crítico)", () => {
    it("caso exitoso: stock, sale y movement quedan todos consistentes tras el commit", () => {
      const product = createProduct({ stock: 10 });

      const sale = salesService.create({ items: [{ productId: product.id, quantity: 3 }] });

      expect(productsService.findById(product.id).stock).toBe(7);
      expect(salesService.findById(sale.id)).toBeTruthy();
      expect(stockMovementsService.findByProduct(product.id)).toHaveLength(1);
    });

    it("caso rollback: un error antes del commit no deja stock, sale ni movement — nada se crea fuera de la transacción", () => {
      const productA = createProduct({ stock: 10 });
      const productB = createProduct({ stock: 2 }); // insuficiente para quantity 5 — falla después de ajustar A

      expect(() =>
        salesService.create({
          items: [
            { productId: productA.id, quantity: 3 },
            { productId: productB.id, quantity: 5 },
          ],
        }),
      ).toThrow();

      // Stock de AMBOS productos vuelve al original — incluido A, cuyo adjustStock() se había
      // aplicado lógicamente antes de que B fallara.
      expect(productsService.findById(productA.id).stock).toBe(10);
      expect(productsService.findById(productB.id).stock).toBe(2);

      // Ninguna venta quedó persistida.
      expect(salesService.findMany()).toHaveLength(0);

      // Ningún movimiento quedó huérfano — ni el de A (que se habría creado antes del fallo de B).
      expect(stockMovementsService.findByProduct(productA.id)).toHaveLength(0);
      expect(stockMovementsService.findByProduct(productB.id)).toHaveLength(0);
    });
  });

  describe("requestId", () => {
    it("los movimientos generados por una operación quedan asociados al requestId de ese contexto", () => {
      const product = createProduct({ stock: 20 });

      const sale = RequestContext.run({ requestId: "req-http-simulated" }, () =>
        salesService.create({ items: [{ productId: product.id, quantity: 3 }] }),
      );

      const movements = stockMovementsService.findByProduct(product.id);
      expect(movements).toHaveLength(1);
      expect(movements[0]!.requestId).toBe("req-http-simulated");

      RequestContext.run({ requestId: "req-http-simulated-cancel" }, () => {
        salesService.cancel(sale.id);
      });

      const afterCancel = stockMovementsService.findByProduct(product.id);
      const cancellation = afterCancel.find((m) => m.type === "SALE_CANCELLATION");
      expect(cancellation?.requestId).toBe("req-http-simulated-cancel");
    });

    it("requestId es null cuando la operación ocurre fuera de un contexto HTTP", () => {
      const product = createProduct({ stock: 20 });
      salesService.create({ items: [{ productId: product.id, quantity: 3 }] });

      const movements = stockMovementsService.findByProduct(product.id);
      expect(movements[0]!.requestId).toBeNull();
    });
  });
});
