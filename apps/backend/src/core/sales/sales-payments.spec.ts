import { BadRequestException } from "@nestjs/common";
import { createSaleSchema } from "@stocknegozia/validation";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../test/create-test-db";
import { createSilentTestLogger } from "../../test/create-test-logger";
import type { Database } from "../../database/database.types";
import { CashAdjustmentsRepository } from "../cash-adjustments/cash-adjustments.repository";
import { CashAdjustmentsService } from "../cash-adjustments/cash-adjustments.service";
import { CategoriesRepository } from "../categories/categories.repository";
import { CategoriesService } from "../categories/categories.service";
import { ProductsRepository } from "../products/products.repository";
import { ProductsService } from "../products/products.service";
import { FinanceRepository } from "../finance/finance.repository";
import { FinanceService } from "../finance/finance.service";
import { ProfitsRepository } from "../profits/profits.repository";
import { ProfitsService } from "../profits/profits.service";
import { PurchasesRepository } from "../purchases/purchases.repository";
import { SettingsRepository } from "../settings/settings.repository";
import { SettingsService } from "../settings/settings.service";
import { StockMovementsRepository } from "../stock-movements/stock-movements.repository";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { SuppliersService } from "../suppliers/suppliers.service";
import { SalesRepository } from "./sales.repository";
import { SalesService } from "./sales.service";

describe("SalesService — medios de pago", () => {
  let db: Database;
  let productsService: ProductsService;
  let salesService: SalesService;
  let profitsService: ProfitsService;
  let financeService: FinanceService;
  let supplierId: number;

  beforeEach(() => {
    db = createTestDb();
    const logger = createSilentTestLogger();
    const stockMovementsService = new StockMovementsService(
      new StockMovementsRepository(db),
      logger,
    );
    const suppliersService = new SuppliersService(new SuppliersRepository(db));
    productsService = new ProductsService(
      db,
      new ProductsRepository(db),
      new CategoriesService(new CategoriesRepository(db)),
      stockMovementsService,
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
    );
    profitsService = new ProfitsService(new ProfitsRepository(db));
    financeService = new FinanceService(
      new FinanceRepository(db),
      new CashAdjustmentsService(new CashAdjustmentsRepository(db), logger),
    );
    supplierId = suppliersService.create({ name: "Proveedor" }).id;
  });

  function createProduct(salePrice: number, stock = 10) {
    return productsService.create({
      name: "Producto",
      sku: `SKU-${Math.random().toString(36).slice(2)}`,
      purchasePrice: salePrice / 2,
      salePrice,
      stock,
      supplierId,
      minimumStock: 0,
      active: true,
    });
  }

  it("con un único pago usa el total calculado por el backend, aunque el cliente mande otro monto", () => {
    const product = createProduct(100_000_000);
    const sale = salesService.create({
      items: [{ productId: product.id, quantity: 2 }],
      payments: [{ method: "transfer", amount: 1, reference: "OP-123" }],
    });

    expect(sale.total).toBe(200_000_000);
    expect(sale.paymentMethods).toEqual(["transfer"]);
    expect(sale.payments).toEqual([
      expect.objectContaining({ method: "transfer", amount: 200_000_000, reference: "OP-123" }),
    ]);
  });

  it("efectivo con monto recibido guarda el vuelto", () => {
    const product = createProduct(9_500);
    const sale = salesService.create({
      items: [{ productId: product.id, quantity: 1 }],
      payments: [{ method: "cash", amountReceived: 10_000 }],
    });
    expect(sale.payments[0]).toMatchObject({ method: "cash", amountReceived: 10_000, change: 500 });
  });

  it("efectivo con monto recibido menor al total se rechaza", () => {
    const product = createProduct(9_500);
    expect(() =>
      salesService.create({
        items: [{ productId: product.id, quantity: 1 }],
        payments: [{ method: "cash", amountReceived: 9_000 }],
      }),
    ).toThrow(BadRequestException);
  });

  it("tarjeta de crédito guarda cuotas y marca", () => {
    const product = createProduct(12_000);
    const sale = salesService.create({
      items: [{ productId: product.id, quantity: 1 }],
      payments: [{ method: "credit_card", installments: 6, cardBrand: "visa" }],
    });
    expect(sale.payments[0]).toMatchObject({ installments: 6, cardBrand: "visa", change: null });
  });

  it("pago mixto: guarda cada pago con su monto", () => {
    const product = createProduct(10_000);
    const sale = salesService.create({
      items: [{ productId: product.id, quantity: 1 }],
      payments: [
        { method: "cash", amount: 4_000 },
        { method: "debit_card", amount: 6_000, cardBrand: "maestro" },
      ],
    });
    expect(sale.paymentMethods).toEqual(["cash", "debit_card"]);
    expect(sale.payments.map((payment) => payment.amount)).toEqual([4_000, 6_000]);
  });

  it("pago mixto que no cubre el total revierte toda la venta (incluido el stock)", () => {
    const product = createProduct(10_000, 5);
    expect(() =>
      salesService.create({
        items: [{ productId: product.id, quantity: 1 }],
        payments: [
          { method: "cash", amount: 4_000 },
          { method: "transfer", amount: 5_000 },
        ],
      }),
    ).toThrow(BadRequestException);
    expect(productsService.findById(product.id).stock).toBe(5);
    expect(salesService.findMany()).toHaveLength(0);
  });

  it("una venta sin pagos (cliente viejo) queda sin medio de pago", () => {
    const product = createProduct(1_000);
    const sale = salesService.create({ items: [{ productId: product.id, quantity: 1 }] });
    expect(sale.payments).toEqual([]);
    expect(salesService.findMany()[0]!.paymentMethods).toEqual([]);
  });

  it("Ganancias: totaliza lo cobrado por medio de pago y anota cada línea", () => {
    const product = createProduct(10_000, 50);
    salesService.create({
      items: [{ productId: product.id, quantity: 1 }],
      payments: [{ method: "cash" }],
    });
    salesService.create({
      items: [{ productId: product.id, quantity: 3 }],
      payments: [
        { method: "cash", amount: 5_000 },
        { method: "credit_card", amount: 25_000, installments: 3 },
      ],
    });
    salesService.create({ items: [{ productId: product.id, quantity: 1 }] });
    const cancelled = salesService.create({
      items: [{ productId: product.id, quantity: 1 }],
      payments: [{ method: "transfer" }],
    });
    salesService.cancel(cancelled.id);

    expect(financeService.getSummary({}).collections.byMethod).toEqual([
      {
        method: "credit_card",
        amount: 25_000,
        salesCount: 1,
        surchargeAmount: 0,
        feeAmount: 0,
        netAmount: 25_000,
      },
      {
        method: "cash",
        amount: 15_000,
        salesCount: 2,
        surchargeAmount: 0,
        feeAmount: 0,
        netAmount: 15_000,
      },
      {
        method: null,
        amount: 10_000,
        salesCount: 1,
        surchargeAmount: 0,
        feeAmount: 0,
        netAmount: 10_000,
      },
    ]);
    expect(profitsService.findMany().map((entry) => entry.paymentMethods)).toContainEqual([
      "cash",
      "credit_card",
    ]);
  });
});

describe("createSaleSchema — pagos", () => {
  const items = [{ productId: 1, quantity: 1 }];

  it("rechaza cuotas fuera de tarjeta de crédito", () => {
    const result = createSaleSchema.safeParse({
      items,
      payments: [{ method: "cash", installments: 3 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza pago mixto sin montos", () => {
    const result = createSaleSchema.safeParse({
      items,
      payments: [{ method: "cash" }, { method: "transfer", amount: 10 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza montos por encima del máximo", () => {
    const result = createSaleSchema.safeParse({
      items,
      payments: [{ method: "cash", amountReceived: 1e15 }],
    });
    expect(result.success).toBe(false);
  });

  it("rechaza un medio de pago desconocido", () => {
    const result = createSaleSchema.safeParse({ items, payments: [{ method: "bitcoin" }] });
    expect(result.success).toBe(false);
  });
});
