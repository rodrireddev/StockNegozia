import { CustomersRepository } from "../customers/customers.repository";
import { CustomersService } from "../customers/customers.service";
import { DEFAULT_PAYMENT_TERMS } from "@stocknegozia/shared";
import { paymentTermsSchema } from "@stocknegozia/validation";
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
import { PurchasesRepository } from "../purchases/purchases.repository";
import { SalesRepository } from "../sales/sales.repository";
import { SalesService } from "../sales/sales.service";
import { SettingsRepository } from "../settings/settings.repository";
import { SettingsService } from "../settings/settings.service";
import { StockMovementsRepository } from "../stock-movements/stock-movements.repository";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { SuppliersService } from "../suppliers/suppliers.service";
import { FinanceRepository } from "./finance.repository";
import { FinanceService } from "./finance.service";

describe("Finanzas + condiciones de cobro", () => {
  let db: Database;
  let productsService: ProductsService;
  let salesService: SalesService;
  let settingsService: SettingsService;
  let cashAdjustmentsService: CashAdjustmentsService;
  let financeService: FinanceService;
  let supplierId: number;

  beforeEach(() => {
    db = createTestDb();
    const logger = createSilentTestLogger();
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
    settingsService = new SettingsService(new SettingsRepository(db));
    salesService = new SalesService(
      db,
      new SalesRepository(db),
      productsService,
      settingsService,
      logger,
      new CustomersService(new CustomersRepository(db), db),
    );
    cashAdjustmentsService = new CashAdjustmentsService(new CashAdjustmentsRepository(db), logger);
    financeService = new FinanceService(new FinanceRepository(db), cashAdjustmentsService);
    supplierId = suppliersService.create({ name: "Proveedor" }).id;
  });

  function createProduct(salePrice: number, purchasePrice: number, stock = 100) {
    return productsService.create({
      name: `Producto ${salePrice}`,
      sku: `SKU-${Math.random().toString(36).slice(2)}`,
      purchasePrice,
      salePrice,
      stock,
      supplierId,
      minimumStock: 0,
      active: true,
    });
  }

  it("sin configurar devuelve las condiciones por defecto, y guarda las del usuario", () => {
    expect(settingsService.getPaymentTerms()).toEqual(DEFAULT_PAYMENT_TERMS);
    const saved = settingsService.updatePaymentTerms(
      paymentTermsSchema.parse({
        ...DEFAULT_PAYMENT_TERMS,
        credit: [
          { installments: 6, surchargePercent: 20, feePercent: 3, settlementDays: 2 },
          { installments: 1, surchargePercent: 0, feePercent: 3, settlementDays: 10 },
        ],
      }),
    );
    // Se ordenan por cuotas.
    expect(saved.credit.map((plan) => plan.installments)).toEqual([1, 6]);
  });

  it("la venta congela recargo, comisión y fecha de acreditación del plan elegido", () => {
    settingsService.updatePaymentTerms({
      ...DEFAULT_PAYMENT_TERMS,
      credit: [
        { installments: 1, surchargePercent: 0, feePercent: 3, settlementDays: 10 },
        { installments: 6, surchargePercent: 20, feePercent: 3, settlementDays: 2 },
      ],
    });
    const product = createProduct(100_000, 60_000);
    const sale = salesService.create({
      items: [{ productId: product.id, quantity: 1 }],
      payments: [{ method: "credit_card", installments: 6 }],
    });
    const [payment] = sale.payments;
    expect(payment).toMatchObject({
      amount: 100_000,
      surchargePercent: 20,
      surchargeAmount: 20_000,
      feePercent: 3,
      feeAmount: 3_600,
      netAmount: 116_400,
    });
    expect(new Date(payment!.settlementDate!).getTime()).toBeGreaterThan(Date.now());

    // Cambiar las condiciones después no altera la venta ya registrada.
    settingsService.updatePaymentTerms(DEFAULT_PAYMENT_TERMS);
    expect(salesService.findById(sale.id).payments[0]!.surchargeAmount).toBe(20_000);
  });

  it("bonificar el recargo en la venta", () => {
    settingsService.updatePaymentTerms({
      ...DEFAULT_PAYMENT_TERMS,
      debit: { surchargePercent: 5, feePercent: 1, settlementDays: 1 },
    });
    const product = createProduct(1_000, 500);
    const sale = salesService.create({
      items: [{ productId: product.id, quantity: 1 }],
      payments: [{ method: "debit_card", waiveSurcharge: true }],
    });
    expect(sale.payments[0]).toMatchObject({ surchargeAmount: 0, feeAmount: 10 });
  });

  it("el resumen separa ventas, compras, retiros de caja y cobros pendientes", () => {
    const product = createProduct(10_000, 6_000);
    salesService.create({
      items: [{ productId: product.id, quantity: 2 }],
      payments: [{ method: "cash" }],
    });
    salesService.create({
      items: [{ productId: product.id, quantity: 1 }],
      payments: [{ method: "credit_card", installments: 1 }],
    });
    cashAdjustmentsService.create({ direction: "OUT", amount: 7_000, reason: "Alquiler" });

    const summary = financeService.getSummary({});
    // Ganancia por ventas: 3 × (10.000 − 6.000) — el retiro NO se resta.
    expect(summary.sales).toMatchObject({
      count: 2,
      revenue: 30_000,
      cost: 18_000,
      profit: 12_000,
    });
    expect(summary.cash.withdrawals).toBe(7_000);
    // El stock inicial del producto entra como compra (ver ProductsService.create).
    expect(summary.purchases.total).toBe(600_000);
    expect(summary.pendingSettlement).toMatchObject({ amount: 10_000, count: 1 });
    expect(summary.granularity).toBe("hour");

    expect(financeService.getSettlements({ status: "pending" })).toHaveLength(1);
    expect(financeService.getTopProducts({ limit: 5 })[0]).toMatchObject({
      quantity: 3,
      profit: 12_000,
    });
  });
});
