import type { CreateProductInput } from "@stocknegozia/validation";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../test/create-test-db";
import { createSilentTestLogger } from "../../test/create-test-logger";
import type { Database } from "../../database/database.types";
import { CategoriesRepository } from "../categories/categories.repository";
import { CategoriesService } from "../categories/categories.service";
import { ProductsRepository } from "../products/products.repository";
import { ProductsService } from "../products/products.service";
import { StockMovementsRepository } from "../stock-movements/stock-movements.repository";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { SalesRepository } from "./sales.repository";
import { SalesService } from "./sales.service";

describe("SalesService", () => {
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

  it("crea una venta básica: toma el precio de Products, calcula subtotal/total, guarda unitPrice y descuenta stock", () => {
    const product = createProduct({ salePrice: 10000, stock: 10 });

    const sale = salesService.create({ items: [{ productId: product.id, quantity: 2 }] });

    expect(sale.items).toHaveLength(1);
    expect(sale.items[0]!.unitPrice).toBe(10000);
    expect(sale.items[0]!.subtotal).toBe(20000);
    expect(sale.total).toBe(20000);
    expect(sale.status).toBe("completed");

    expect(productsService.findById(product.id).stock).toBe(8);
  });

  it("crea una venta con varios productos: crea todos los items, descuenta el stock de todos y calcula el total", () => {
    const productA = createProduct({ salePrice: 1000, stock: 10 });
    const productB = createProduct({ salePrice: 2000, stock: 5 });

    const sale = salesService.create({
      items: [
        { productId: productA.id, quantity: 3 },
        { productId: productB.id, quantity: 2 },
      ],
    });

    expect(sale.items).toHaveLength(2);
    expect(sale.total).toBe(3 * 1000 + 2 * 2000);
    expect(productsService.findById(productA.id).stock).toBe(7);
    expect(productsService.findById(productB.id).stock).toBe(3);
  });

  it("falla si el stock es insuficiente, sin crear venta/items ni modificar stock", () => {
    const product = createProduct({ stock: 2 });

    expect(() =>
      salesService.create({ items: [{ productId: product.id, quantity: 3 }] }),
    ).toThrow();

    expect(productsService.findById(product.id).stock).toBe(2);
    expect(salesService.findMany()).toHaveLength(0);
  });

  it("falla si el producto no existe, sin efectos parciales", () => {
    expect(() => salesService.create({ items: [{ productId: 999_999, quantity: 1 }] })).toThrow();
    expect(salesService.findMany()).toHaveLength(0);
  });

  it("hace rollback completo si un item posterior falla por stock insuficiente", () => {
    const productA = createProduct({ stock: 10 });
    const productB = createProduct({ stock: 2 }); // insuficiente para quantity 5

    expect(() =>
      salesService.create({
        items: [
          { productId: productA.id, quantity: 2 },
          { productId: productB.id, quantity: 5 },
        ],
      }),
    ).toThrow();

    expect(productsService.findById(productA.id).stock).toBe(10);
    expect(productsService.findById(productB.id).stock).toBe(2);
    expect(salesService.findMany()).toHaveLength(0);
  });

  it("mantiene el precio histórico aunque el producto cambie de precio después", () => {
    const product = createProduct({ salePrice: 10000 });
    const sale = salesService.create({ items: [{ productId: product.id, quantity: 1 }] });

    productsService.update(product.id, { salePrice: 20000 });

    const found = salesService.findById(sale.id);
    expect(found.items[0]!.unitPrice).toBe(10000);
    expect(found.items[0]!.subtotal).toBe(10000);
  });

  it("normaliza items duplicados del mismo producto en una sola línea", () => {
    const product = createProduct({ salePrice: 1000, stock: 10 });

    const sale = salesService.create({
      items: [
        { productId: product.id, quantity: 2 },
        { productId: product.id, quantity: 3 },
      ],
    });

    expect(sale.items).toHaveLength(1);
    expect(sale.items[0]!.quantity).toBe(5);
    expect(sale.total).toBe(5000);
    expect(productsService.findById(product.id).stock).toBe(5);
  });

  describe("cancelación", () => {
    it("cambia el estado a cancelled, restaura stock, setea cancelledAt y mantiene la venta con sus items", () => {
      const product = createProduct({ stock: 10 });
      const sale = salesService.create({ items: [{ productId: product.id, quantity: 4 }] });
      expect(productsService.findById(product.id).stock).toBe(6);

      const cancelled = salesService.cancel(sale.id);

      expect(cancelled.status).toBe("cancelled");
      expect(cancelled.cancelledAt).not.toBeNull();
      expect(productsService.findById(product.id).stock).toBe(10);

      const found = salesService.findById(sale.id);
      expect(found.status).toBe("cancelled");
      expect(found.items).toHaveLength(1);
    });

    it("no permite cancelar dos veces, y no vuelve a restaurar stock", () => {
      const product = createProduct({ stock: 10 });
      const sale = salesService.create({ items: [{ productId: product.id, quantity: 4 }] });
      salesService.cancel(sale.id);
      expect(productsService.findById(product.id).stock).toBe(10);

      expect(() => salesService.cancel(sale.id)).toThrow();
      expect(productsService.findById(product.id).stock).toBe(10);
    });

    it("devuelve un error apropiado al cancelar una venta inexistente", () => {
      expect(() => salesService.cancel(999_999)).toThrow();
    });
  });
});
