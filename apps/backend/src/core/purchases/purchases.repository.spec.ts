import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../test/create-test-db";
import type { Database } from "../../database/database.types";
import { products, suppliers } from "../../database/schema";
import { PurchasesRepository } from "./purchases.repository";

describe("PurchasesRepository", () => {
  let db: Database;
  let repository: PurchasesRepository;
  let productAId: number;
  let productBId: number;
  let supplierId: number;

  beforeEach(() => {
    db = createTestDb();
    repository = new PurchasesRepository(db);

    const now = new Date();
    supplierId = db
      .insert(suppliers)
      .values({ name: "ACME", createdAt: now })
      .returning({ id: suppliers.id })
      .get().id;
    productAId = db
      .insert(products)
      .values({
        name: "Producto A",
        sku: "SKU-A",
        purchasePrice: 50,
        salePrice: 100,
        stock: 10,
        minimumStock: 0,
        active: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: products.id })
      .get().id;
    productBId = db
      .insert(products)
      .values({
        name: "Producto B",
        sku: "SKU-B",
        purchasePrice: 50,
        salePrice: 100,
        stock: 10,
        minimumStock: 0,
        active: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: products.id })
      .get().id;
  });

  it("crea una compra y sus items, y los recupera por id con el nombre del proveedor", () => {
    const purchase = repository.insertPurchase({ supplierId, total: 700, createdAt: new Date() });
    repository.insertPurchaseItems([
      { purchaseId: purchase.id, productId: productAId, quantity: 2, unitCost: 200, subtotal: 400 },
      { purchaseId: purchase.id, productId: productBId, quantity: 1, unitCost: 300, subtotal: 300 },
    ]);

    const found = repository.findById(purchase.id);
    expect(found?.total).toBe(700);
    expect(found?.supplierId).toBe(supplierId);
    expect(found?.supplierName).toBe("ACME");

    const items = repository.findItemsByPurchaseId(purchase.id);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.subtotal).sort()).toEqual([300, 400]);
  });

  it("lista compras de la más reciente a la más antigua", () => {
    const first = repository.insertPurchase({
      supplierId,
      total: 10,
      createdAt: new Date("2025-01-01T00:00:00Z"),
    });
    const second = repository.insertPurchase({
      supplierId,
      total: 20,
      createdAt: new Date("2025-06-01T00:00:00Z"),
    });

    const list = repository.findMany();
    expect(list.map((purchase) => purchase.id)).toEqual([second.id, first.id]);
  });

  it("respeta la foreign key: no permite un purchase_item con un producto inexistente", () => {
    const purchase = repository.insertPurchase({ supplierId, total: 100, createdAt: new Date() });

    expect(() =>
      repository.insertPurchaseItems([
        { purchaseId: purchase.id, productId: 999_999, quantity: 1, unitCost: 100, subtotal: 100 },
      ]),
    ).toThrow();
  });

  it("respeta la foreign key: no permite una purchase con un proveedor inexistente", () => {
    expect(() =>
      repository.insertPurchase({ supplierId: 999_999, total: 100, createdAt: new Date() }),
    ).toThrow();
  });
});
