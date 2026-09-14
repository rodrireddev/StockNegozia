import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../test/create-test-db";
import type { Database } from "../../database/database.types";
import { products } from "../../database/schema";
import { SalesRepository } from "./sales.repository";

describe("SalesRepository", () => {
  let db: Database;
  let repository: SalesRepository;
  let productAId: number;
  let productBId: number;

  beforeEach(() => {
    db = createTestDb();
    repository = new SalesRepository(db);

    const now = new Date();
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

  it("crea una venta y sus items, y los recupera por id", () => {
    const sale = repository.insertSale({ status: "completed", total: 300, createdAt: new Date() });
    repository.insertSaleItems([
      { saleId: sale.id, productId: productAId, quantity: 2, unitPrice: 100, subtotal: 200 },
      { saleId: sale.id, productId: productBId, quantity: 1, unitPrice: 100, subtotal: 100 },
    ]);

    const found = repository.findById(sale.id);
    expect(found?.total).toBe(300);
    expect(found?.status).toBe("completed");

    const items = repository.findItemsBySaleId(sale.id);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.subtotal).sort()).toEqual([100, 200]);
  });

  it("lista ventas de la más reciente a la más antigua", () => {
    const first = repository.insertSale({
      status: "completed",
      total: 10,
      createdAt: new Date("2025-01-01T00:00:00Z"),
    });
    const second = repository.insertSale({
      status: "completed",
      total: 20,
      createdAt: new Date("2025-06-01T00:00:00Z"),
    });

    const list = repository.findMany();
    expect(list.map((sale) => sale.id)).toEqual([second.id, first.id]);
  });

  it("marca una venta como cancelada con su cancelledAt", () => {
    const sale = repository.insertSale({ status: "completed", total: 50, createdAt: new Date() });
    // Los timestamps de Drizzle en SQLite se guardan con precisión de segundos (igual que
    // createdAt/updatedAt en Products), por eso se compara truncando a segundos.
    const cancelledAt = new Date(Math.floor(Date.now() / 1000) * 1000);
    repository.markCancelled(sale.id, cancelledAt);

    const found = repository.findById(sale.id);
    expect(found?.status).toBe("cancelled");
    expect(found?.cancelledAt?.getTime()).toBe(cancelledAt.getTime());
  });

  it("respeta la foreign key: no permite un sale_item con un producto inexistente", () => {
    const sale = repository.insertSale({ status: "completed", total: 100, createdAt: new Date() });

    expect(() =>
      repository.insertSaleItems([
        { saleId: sale.id, productId: 999_999, quantity: 1, unitPrice: 100, subtotal: 100 },
      ]),
    ).toThrow();
  });
});
