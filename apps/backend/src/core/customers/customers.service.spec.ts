import { BadRequestException, NotFoundException } from "@nestjs/common";
import { createSaleSchema } from "@stocknegozia/validation";
import { CashAdjustmentsRepository } from "../cash-adjustments/cash-adjustments.repository";
import { CashAdjustmentsService } from "../cash-adjustments/cash-adjustments.service";
import { FinanceRepository } from "../finance/finance.repository";
import { FinanceService } from "../finance/finance.service";
import { beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../database/database.types";
import { createTestDb } from "../../test/create-test-db";
import { createSilentTestLogger } from "../../test/create-test-logger";
import { CategoriesRepository } from "../categories/categories.repository";
import { CategoriesService } from "../categories/categories.service";
import { ProductsRepository } from "../products/products.repository";
import { ProductsService } from "../products/products.service";
import { PurchasesRepository } from "../purchases/purchases.repository";
import { SalesRepository } from "../sales/sales.repository";
import { SalesService } from "../sales/sales.service";
import { SettingsRepository } from "../settings/settings.repository";
import { SettingsService } from "../settings/settings.service";
import { StockMovementsRepository } from "../stock-movements/stock-movements.repository";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { SuppliersService } from "../suppliers/suppliers.service";
import { CustomersRepository } from "./customers.repository";
import { CustomersService } from "./customers.service";

describe("CustomersService", () => {
  let db: Database;
  let customersService: CustomersService;
  let salesService: SalesService;
  let productsService: ProductsService;
  let productId: number;

  beforeEach(() => {
    db = createTestDb();
    const logger = createSilentTestLogger();
    customersService = new CustomersService(new CustomersRepository(db), db);
    const suppliersService = new SuppliersService(new SuppliersRepository(db));
    productsService = new ProductsService(
      db,
      new ProductsRepository(db),
      new CategoriesService(new CategoriesRepository(db)),
      new StockMovementsService(new StockMovementsRepository(db), logger),
      suppliersService,
      new PurchasesRepository(db),
      logger,
    );
    salesService = new SalesService(
      db,
      new SalesRepository(db),
      productsService,
      new SettingsService(new SettingsRepository(db)),
      logger,
      customersService,
    );
    productId = productsService.create({
      name: "Yerba",
      sku: "YERBA-1",
      purchasePrice: 500,
      salePrice: 1000,
      stock: 10,
      supplierId: suppliersService.create({ name: "Proveedor" }).id,
      minimumStock: 0,
      active: true,
    }).id;
  });

  it("crea, edita (vaciando campos) y lista ordenado por nombre", () => {
    const zoe = customersService.create({ name: "Zoe", phone: "123", email: "zoe@mail.com" });
    customersService.create({ name: "Ana" });

    const updated = customersService.update(zoe.id, { name: "Zoe G." });
    expect(updated.phone).toBeNull();
    expect(updated.email).toBeNull();
    expect(customersService.findAll().map((c) => c.name)).toEqual(["Ana", "Zoe G."]);
  });

  it("calcula historial solo con ventas completadas", () => {
    const customer = customersService.create({ name: "Ana" });
    expect(customersService.findById(customer.id)).toMatchObject({
      salesCount: 0,
      totalSpent: 0,
      lastSaleAt: null,
    });

    salesService.create({ items: [{ productId, quantity: 2 }], customerId: customer.id });
    const cancelled = salesService.create({
      items: [{ productId, quantity: 1 }],
      customerId: customer.id,
    });
    salesService.cancel(cancelled.id);
    salesService.create({ items: [{ productId, quantity: 1 }] }); // venta de mostrador

    const stats = customersService.findById(customer.id);
    expect(stats.salesCount).toBe(1);
    expect(stats.totalSpent).toBe(2000);
    expect(stats.lastSaleAt).not.toBeNull();
    expect(salesService.findMany(customer.id).map((s) => s.customerId)).toEqual([
      customer.id,
      customer.id,
    ]);
    expect(salesService.findMany()).toHaveLength(3);
  });

  it("una venta con cliente inexistente falla sin descontar stock", () => {
    expect(() =>
      salesService.create({ items: [{ productId, quantity: 1 }], customerId: 999 }),
    ).toThrow(NotFoundException);
    expect(productsService.findById(productId).stock).toBe(10);
  });

  describe("cuenta corriente (fiado)", () => {
    const onAccount = (customerId: number | undefined, quantity = 1) =>
      salesService.create({
        items: [{ productId, quantity }],
        customerId,
        payments: [{ method: "account" }],
      });

    it("vender a cuenta suma al saldo; pagar descuenta; no deja pagar de más", () => {
      const ana = customersService.create({ name: "Ana" });
      onAccount(ana.id, 3); // 3000

      expect(customersService.findById(ana.id).balance).toBe(3000);

      const account = customersService.registerPayment(ana.id, { amount: 1000, method: "cash" });
      expect(account.balance).toBe(2000);
      expect(account.entries.map((e) => [e.type, e.amount])).toEqual([
        ["payment", 1000],
        ["sale", 3000],
      ]);

      expect(() =>
        customersService.registerPayment(ana.id, { amount: 2000.01, method: "transfer" }),
      ).toThrow(BadRequestException);
      expect(customersService.findById(ana.id).balance).toBe(2000);
    });

    it("cancelar una venta a cuenta la saca del saldo", () => {
      const ana = customersService.create({ name: "Ana" });
      const sale = onAccount(ana.id, 2);
      salesService.cancel(sale.id);
      expect(customersService.findById(ana.id).balance).toBe(0);
    });

    it("el schema exige cliente para vender a cuenta", () => {
      const result = createSaleSchema.safeParse({
        items: [{ productId, quantity: 1 }],
        payments: [{ method: "account" }],
      });
      expect(result.success).toBe(false);
    });

    it("Finanzas: el fiado no cuenta como cobrado, se informa en receivables", () => {
      const ana = customersService.create({ name: "Ana" });
      const beto = customersService.create({ name: "Beto" });
      onAccount(ana.id, 2); // 2000 a cuenta
      onAccount(beto.id, 1); // 1000 a cuenta
      salesService.create({ items: [{ productId, quantity: 1 }], payments: [{ method: "cash" }] });
      customersService.registerPayment(ana.id, { amount: 500, method: "cash" });

      const logger = createSilentTestLogger();
      const finance = new FinanceService(
        new FinanceRepository(db),
        new CashAdjustmentsService(new CashAdjustmentsRepository(db), logger),
      );
      const summary = finance.getSummary({
        from: new Date(Date.now() - 60_000),
        to: new Date(Date.now() + 60_000),
      });

      expect(summary.sales.revenue).toBe(4000);
      expect(summary.collections.total).toBe(1000);
      expect(summary.collections.byMethod.map((m) => m.method)).toEqual(["cash"]);
      expect(summary.receivables).toEqual({
        soldOnAccount: 3000,
        received: 500,
        outstanding: 2500,
      });
    });
  });
});
