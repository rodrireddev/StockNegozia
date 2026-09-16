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
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { SuppliersService } from "../suppliers/suppliers.service";
import { PurchasesRepository } from "./purchases.repository";
import { PurchasesService } from "./purchases.service";

describe("PurchasesService", () => {
  let db: Database;
  let productsService: ProductsService;
  let suppliersService: SuppliersService;
  let purchasesService: PurchasesService;
  let defaultSupplierId: number;

  beforeEach(() => {
    db = createTestDb();
    const logger = createSilentTestLogger();
    const categoriesRepository = new CategoriesRepository(db);
    const categoriesService = new CategoriesService(categoriesRepository);
    const productsRepository = new ProductsRepository(db);
    const stockMovementsService = new StockMovementsService(new StockMovementsRepository(db), logger);
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

  function createSupplier(name = "ACME") {
    return suppliersService.create({ name });
  }

  it("crea una compra simple: crea el purchase_item, calcula subtotal/total y aumenta el stock", () => {
    const supplier = createSupplier();
    const product = createProduct({ stock: 10 });

    const purchase = purchasesService.create({
      supplierId: supplier.id,
      items: [{ productId: product.id, quantity: 20, unitCost: 500 }],
    });

    expect(purchase.items).toHaveLength(1);
    expect(purchase.items[0]!.unitCost).toBe(500);
    expect(purchase.items[0]!.subtotal).toBe(10_000);
    expect(purchase.total).toBe(10_000);
    expect(purchase.supplierId).toBe(supplier.id);
    expect(purchase.supplierName).toBe("ACME");

    expect(productsService.findById(product.id).stock).toBe(30);
  });

  it("crea una compra con múltiples productos: crea todos los items, aumenta todos los stocks y calcula el total", () => {
    const supplier = createSupplier();
    const productA = createProduct({ stock: 10 });
    const productB = createProduct({ stock: 5 });

    const purchase = purchasesService.create({
      supplierId: supplier.id,
      items: [
        { productId: productA.id, quantity: 20, unitCost: 500 },
        { productId: productB.id, quantity: 5, unitCost: 1200 },
      ],
    });

    expect(purchase.items).toHaveLength(2);
    expect(purchase.total).toBe(20 * 500 + 5 * 1200);
    expect(productsService.findById(productA.id).stock).toBe(30);
    expect(productsService.findById(productB.id).stock).toBe(10);
  });

  it("calcula subtotal como quantity × unitCost por cada item", () => {
    const supplier = createSupplier();
    const product = createProduct();

    const purchase = purchasesService.create({
      supplierId: supplier.id,
      items: [{ productId: product.id, quantity: 7, unitCost: 250 }],
    });

    expect(purchase.items[0]!.subtotal).toBe(1750);
  });

  it("calcula el total como la suma de subtotales de los items", () => {
    const supplier = createSupplier();
    const productA = createProduct();
    const productB = createProduct();

    const purchase = purchasesService.create({
      supplierId: supplier.id,
      items: [
        { productId: productA.id, quantity: 2, unitCost: 100 },
        { productId: productB.id, quantity: 3, unitCost: 50 },
      ],
    });

    expect(purchase.total).toBe(2 * 100 + 3 * 50);
  });

  it("ignora costo unitario cero como caso válido (no negativo)", () => {
    const supplier = createSupplier();
    const product = createProduct();

    const purchase = purchasesService.create({
      supplierId: supplier.id,
      items: [{ productId: product.id, quantity: 5, unitCost: 0 }],
    });

    expect(purchase.total).toBe(0);
  });

  it("falla si el proveedor no existe, sin crear purchase/items ni modificar stock", () => {
    const product = createProduct({ stock: 10 });

    expect(() =>
      purchasesService.create({
        supplierId: 999_999,
        items: [{ productId: product.id, quantity: 5, unitCost: 100 }],
      }),
    ).toThrow();

    expect(productsService.findById(product.id).stock).toBe(10);
    expect(purchasesService.findMany()).toHaveLength(1); // la del stock inicial de `product`
  });

  it("falla si un producto no existe, sin efectos parciales", () => {
    const supplier = createSupplier();

    expect(() =>
      purchasesService.create({
        supplierId: supplier.id,
        items: [{ productId: 999_999, quantity: 1, unitCost: 100 }],
      }),
    ).toThrow();

    expect(purchasesService.findMany()).toHaveLength(0);
  });

  it("falla con cantidad inválida (0), sin crear nada ni modificar stock", () => {
    const supplier = createSupplier();
    const product = createProduct({ stock: 10 });

    expect(() =>
      purchasesService.create({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 0, unitCost: 100 }],
      }),
    ).toThrow();

    expect(productsService.findById(product.id).stock).toBe(10);
    expect(purchasesService.findMany()).toHaveLength(1); // la del stock inicial de `product`
  });

  it("falla con cantidad negativa, sin crear nada ni modificar stock", () => {
    const supplier = createSupplier();
    const product = createProduct({ stock: 10 });

    expect(() =>
      purchasesService.create({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: -1, unitCost: 100 }],
      }),
    ).toThrow();

    expect(productsService.findById(product.id).stock).toBe(10);
    expect(purchasesService.findMany()).toHaveLength(1); // la del stock inicial de `product`
  });

  it("falla con costo unitario negativo, sin crear nada ni modificar stock", () => {
    const supplier = createSupplier();
    const product = createProduct({ stock: 10 });

    expect(() =>
      purchasesService.create({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 5, unitCost: -1 }],
      }),
    ).toThrow();

    expect(productsService.findById(product.id).stock).toBe(10);
    expect(purchasesService.findMany()).toHaveLength(1); // la del stock inicial de `product`
  });

  it("falla si se repite el mismo producto dentro de la misma compra, sin crear nada", () => {
    const supplier = createSupplier();
    const product = createProduct({ stock: 10 });

    expect(() =>
      purchasesService.create({
        supplierId: supplier.id,
        items: [
          { productId: product.id, quantity: 2, unitCost: 100 },
          { productId: product.id, quantity: 3, unitCost: 100 },
        ],
      }),
    ).toThrow();

    expect(productsService.findById(product.id).stock).toBe(10);
    expect(purchasesService.findMany()).toHaveLength(1); // la del stock inicial de `product`
  });

  describe("atomicidad", () => {
    it("hace rollback completo si un item posterior falla por producto inexistente", () => {
      const supplier = createSupplier();
      const productA = createProduct({ stock: 10 });

      expect(() =>
        purchasesService.create({
          supplierId: supplier.id,
          items: [
            { productId: productA.id, quantity: 10, unitCost: 100 },
            { productId: 999_999, quantity: 5, unitCost: 100 },
          ],
        }),
      ).toThrow();

      // El stock de A vuelve al original — no queda +10 aplicado aunque se haya procesado antes
      // de que el item de B fallara.
      expect(productsService.findById(productA.id).stock).toBe(10);
      expect(purchasesService.findMany()).toHaveLength(1); // la del stock inicial de A
    });
  });

  describe("GET /purchases", () => {
    it("findMany devuelve las compras creadas", () => {
      const supplier = createSupplier();
      // `createProduct()` también deja su propia compra de stock inicial — de ahí el +1.
      const product = createProduct();
      purchasesService.create({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 1, unitCost: 100 }],
      });

      expect(purchasesService.findMany()).toHaveLength(2);
    });

    it("findById devuelve la compra con sus items", () => {
      const supplier = createSupplier();
      const product = createProduct();
      const created = purchasesService.create({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 2, unitCost: 100 }],
      });

      const found = purchasesService.findById(created.id);
      expect(found.items).toHaveLength(1);
      expect(found.items[0]!.productId).toBe(product.id);
    });

    it("findById de una compra inexistente lanza 404", () => {
      expect(() => purchasesService.findById(999_999)).toThrow();
    });
  });

  describe("snapshot del proveedor — renombrar/editar un proveedor no reescribe compras pasadas", () => {
    it("una compra ya creada conserva el nombre del proveedor tal como era al momento de la compra", () => {
      const supplier = createSupplier("Distribuidora Vieja");
      const product = createProduct();
      const purchase = purchasesService.create({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 1, unitCost: 100 }],
      });
      expect(purchase.supplierName).toBe("Distribuidora Vieja");

      suppliersService.update(supplier.id, { name: "Distribuidora Nueva" });

      const found = purchasesService.findById(purchase.id);
      expect(found.supplierName).toBe("Distribuidora Vieja");
      expect(found.supplierId).toBe(supplier.id); // sigue referenciando al mismo proveedor real

      // El proveedor en sí SÍ refleja el nuevo nombre — solo el historial queda congelado.
      expect(suppliersService.findById(supplier.id).name).toBe("Distribuidora Nueva");
    });

    it("findMany también refleja el nombre histórico, no el actual", () => {
      const supplier = createSupplier("Nombre Original");
      const product = createProduct();
      const purchase = purchasesService.create({
        supplierId: supplier.id,
        items: [{ productId: product.id, quantity: 1, unitCost: 100 }],
      });

      suppliersService.update(supplier.id, { name: "Nombre Cambiado" });

      const found = purchasesService.findMany().find((p) => p.id === purchase.id);
      expect(found?.supplierName).toBe("Nombre Original");
    });
  });
});
