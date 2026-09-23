import type { CreateProductInput } from "@stocknegozia/validation";
import { beforeEach, describe, expect, it } from "vitest";
import { RequestContext } from "../../common/logger/request-context";
import { createSilentTestLogger } from "../../test/create-test-logger";
import { createTestDb } from "../../test/create-test-db";
import type { Database } from "../../database/database.types";
import { CredentialService } from "../../auth/credential/credential.service";
import { DevicesRepository } from "../../auth/devices/devices.repository";
import { DevicesService } from "../../auth/devices/devices.service";
import { CategoriesRepository } from "../categories/categories.repository";
import { CategoriesService } from "../categories/categories.service";
import { ProductsRepository } from "../products/products.repository";
import { ProductsService } from "../products/products.service";
import { PurchasesRepository } from "../purchases/purchases.repository";
import { SettingsRepository } from "../settings/settings.repository";
import { SettingsService } from "../settings/settings.service";
import { StockMovementsRepository } from "../stock-movements/stock-movements.repository";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { SuppliersService } from "../suppliers/suppliers.service";
import { SalesRepository } from "../sales/sales.repository";
import { SalesService } from "../sales/sales.service";
import { CashAdjustmentsRepository } from "../cash-adjustments/cash-adjustments.repository";
import { CashAdjustmentsService } from "../cash-adjustments/cash-adjustments.service";
import { ProfitsRepository } from "./profits.repository";
import { ProfitsService } from "./profits.service";

describe("ProfitsService", () => {
  let db: Database;
  let productsService: ProductsService;
  let salesService: SalesService;
  let devicesService: DevicesService;
  let profitsService: ProfitsService;
  let cashAdjustmentsService: CashAdjustmentsService;
  let defaultSupplierId: number;

  beforeEach(() => {
    db = createTestDb();
    const logger = createSilentTestLogger();
    const categoriesService = new CategoriesService(new CategoriesRepository(db));
    const stockMovementsService = new StockMovementsService(new StockMovementsRepository(db), logger);
    const suppliersService = new SuppliersService(new SuppliersRepository(db));
    devicesService = new DevicesService(new DevicesRepository(db), new CredentialService(), logger);
    productsService = new ProductsService(
      db,
      new ProductsRepository(db),
      categoriesService,
      stockMovementsService,
      suppliersService,
      new PurchasesRepository(db),
      logger,
    );
    const settingsService = new SettingsService(new SettingsRepository(db));
    salesService = new SalesService(db, new SalesRepository(db), productsService, settingsService, logger);
    cashAdjustmentsService = new CashAdjustmentsService(new CashAdjustmentsRepository(db), logger);
    profitsService = new ProfitsService(new ProfitsRepository(db), cashAdjustmentsService);
    defaultSupplierId = suppliersService.create({ name: "Proveedor de prueba" }).id;
  });

  function createProduct(overrides: Partial<CreateProductInput> = {}) {
    const stock = overrides.stock ?? 10;
    return productsService.create({
      name: "Producto de prueba",
      sku: `SKU-${Math.random().toString(36).slice(2)}`,
      purchasePrice: 5000,
      salePrice: 10000,
      stock,
      supplierId: stock > 0 ? defaultSupplierId : undefined,
      minimumStock: 0,
      active: true,
      ...overrides,
    });
  }

  it("calcula revenue/cost/profit de cada línea a partir del costo y precio congelados en la venta", () => {
    const product = createProduct({ purchasePrice: 5000, salePrice: 10000 });
    salesService.create({ items: [{ productId: product.id, quantity: 2 }] });

    const [entry] = profitsService.findMany();
    expect(entry!.productId).toBe(product.id);
    expect(entry!.quantity).toBe(2);
    expect(entry!.unitPrice).toBe(10000);
    expect(entry!.unitCost).toBe(5000);
    expect(entry!.revenue).toBe(20000);
    expect(entry!.cost).toBe(10000);
    expect(entry!.profit).toBe(10000);
  });

  it("una venta cancelada no aparece en el historial de ganancias", () => {
    const product = createProduct();
    const sale = salesService.create({ items: [{ productId: product.id, quantity: 1 }] });

    expect(profitsService.findMany()).toHaveLength(1);

    salesService.cancel(sale.id);
    expect(profitsService.findMany()).toHaveLength(0);
  });

  it("un precio de compra actualizado después de la venta no cambia la ganancia ya calculada", () => {
    const product = createProduct({ purchasePrice: 5000, salePrice: 10000 });
    salesService.create({ items: [{ productId: product.id, quantity: 1 }] });

    productsService.update(product.id, { purchasePrice: 9000 });

    const [entry] = profitsService.findMany();
    expect(entry!.unitCost).toBe(5000);
    expect(entry!.profit).toBe(5000);
  });

  it("findMany filtra por productId", () => {
    const productA = createProduct();
    const productB = createProduct();
    salesService.create({ items: [{ productId: productA.id, quantity: 1 }] });
    salesService.create({ items: [{ productId: productB.id, quantity: 1 }] });

    expect(profitsService.findMany({ productId: productA.id })).toHaveLength(1);
    expect(profitsService.findMany({ productId: productA.id })[0]!.productId).toBe(productA.id);
  });

  it("asocia el dispositivo/vendedor que hizo la venta, igual que Movimientos", () => {
    const { deviceId } = devicesService.register("Electron Desktop", "desktop", { isAdmin: true });
    devicesService.updateSellerName(deviceId, "Rodrigo");
    const product = createProduct();

    RequestContext.run({ requestId: "req-1" }, () => {
      RequestContext.setDevice({ id: deviceId, name: "Electron Desktop", type: "desktop", sellerName: "Rodrigo" });
      salesService.create({ items: [{ productId: product.id, quantity: 1 }] });
    });

    const [entry] = profitsService.findMany();
    expect(entry!.deviceName).toBe("Rodrigo");
    expect(entry!.deviceType).toBe("desktop");
  });

  it("deviceName es null fuera de un contexto de request autenticado", () => {
    const product = createProduct();
    salesService.create({ items: [{ productId: product.id, quantity: 1 }] });

    expect(profitsService.findMany()[0]!.deviceName).toBeNull();
  });

  describe("findDailySummary", () => {
    it("agrupa la ganancia del día de hoy y completa los días sin ventas en 0", () => {
      const product = createProduct({ purchasePrice: 5000, salePrice: 10000 });
      salesService.create({ items: [{ productId: product.id, quantity: 1 }] });
      salesService.create({ items: [{ productId: product.id, quantity: 1 }] });

      const summary = profitsService.findDailySummary(7);
      expect(summary).toHaveLength(7);

      const today = summary[summary.length - 1]!;
      expect(today.profit).toBe(10000);
      expect(today.revenue).toBe(20000);
      expect(today.cost).toBe(10000);

      const otherDays = summary.slice(0, -1);
      expect(otherDays.every((day) => day.profit === 0 && day.revenue === 0 && day.cost === 0)).toBe(true);
    });

    it("un retiro de caja resta de la ganancia del día sin tocar vendido/costo", () => {
      const product = createProduct({ purchasePrice: 5000, salePrice: 10000 });
      salesService.create({ items: [{ productId: product.id, quantity: 1 }] });
      cashAdjustmentsService.create({ direction: "OUT", amount: 3000, reason: "Pago sueldo" });

      const today = profitsService.findDailySummary(1)[0]!;
      expect(today.revenue).toBe(10000);
      expect(today.cost).toBe(5000);
      expect(today.profit).toBe(2000); // 5000 (margen) - 3000 (retiro)
    });
  });

  describe("findLedger", () => {
    it("combina ventas y ajustes de caja ordenados del más reciente al más viejo", () => {
      const product = createProduct();
      salesService.create({ items: [{ productId: product.id, quantity: 1 }] });
      cashAdjustmentsService.create({ direction: "OUT", amount: 500, reason: "Pago sueldo" });

      const ledger = profitsService.findLedger();
      expect(ledger).toHaveLength(2);
      expect(ledger.map((entry) => entry.kind).sort()).toEqual(["cashAdjustment", "sale"]);
    });

    it("filtrar por productId excluye los ajustes de caja (no están atados a ningún producto)", () => {
      const product = createProduct();
      salesService.create({ items: [{ productId: product.id, quantity: 1 }] });
      cashAdjustmentsService.create({ direction: "OUT", amount: 500, reason: "Pago sueldo" });

      const ledger = profitsService.findLedger({ productId: product.id });
      expect(ledger).toHaveLength(1);
      expect(ledger[0]!.kind).toBe("sale");
    });
  });

  describe("findHourlySummary", () => {
    it("agrupa por hora del día de hoy, con retiros de caja restando del margen de venta", () => {
      const product = createProduct({ purchasePrice: 5000, salePrice: 10000 });
      salesService.create({ items: [{ productId: product.id, quantity: 1 }] });
      cashAdjustmentsService.create({ direction: "OUT", amount: 1000, reason: "Pago sueldo" });

      const hourly = profitsService.findHourlySummary();
      expect(hourly).toHaveLength(24);

      const currentHour = new Date().getHours();
      const bucket = hourly[currentHour]!;
      expect(bucket.revenue).toBe(10000);
      expect(bucket.cost).toBe(5000);
      expect(bucket.profit).toBe(4000); // 5000 (margen) - 1000 (retiro)

      const otherHours = hourly.filter((_, hour) => hour !== currentHour);
      expect(otherHours.every((hour) => hour.profit === 0)).toBe(true);
    });
  });
});
