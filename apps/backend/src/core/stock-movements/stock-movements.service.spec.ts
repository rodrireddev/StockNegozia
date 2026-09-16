import { BadRequestException } from "@nestjs/common";
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
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { SuppliersService } from "../suppliers/suppliers.service";
import { StockMovementsRepository } from "./stock-movements.repository";
import { StockMovementsService } from "./stock-movements.service";

describe("StockMovementsService", () => {
  let db: Database;
  let service: StockMovementsService;
  let productsService: ProductsService;
  let devicesService: DevicesService;

  beforeEach(() => {
    db = createTestDb();
    const logger = createSilentTestLogger();
    service = new StockMovementsService(new StockMovementsRepository(db), logger);
    devicesService = new DevicesService(new DevicesRepository(db), new CredentialService(), logger);

    const categoriesService = new CategoriesService(new CategoriesRepository(db));
    const suppliersService = new SuppliersService(new SuppliersRepository(db));
    // ProductsService requiere un StockMovementsService — se usa la misma instancia para poder
    // consultar, en los tests, los movimientos que `adjustStock()` genera indirectamente.
    productsService = new ProductsService(
      db,
      new ProductsRepository(db),
      categoriesService,
      service,
      suppliersService,
      new PurchasesRepository(db),
      logger,
    );
  });

  // stock 0: estos tests ejercitan `record()`/`findMany()`/`findByProduct()` directamente — un
  // stock inicial > 0 dejaría además un movimiento PURCHASE propio (ver
  // products-initial-stock.spec.ts) que interferiría con los conteos/filtros exactos que se
  // verifican acá.
  function createProduct(stock = 0) {
    return productsService.create({
      name: "Producto de prueba",
      sku: `SKU-${Math.random().toString(36).slice(2)}`,
      purchasePrice: 100,
      salePrice: 200,
      stock,
      minimumStock: 0,
      active: true,
    });
  }

  describe("record", () => {
    it("crea el movimiento conservando stockBefore/stockAfter/quantity/direction/type", () => {
      const product = createProduct();

      const movement = service.record({
        productId: product.id,
        type: "ADJUSTMENT",
        direction: "OUT",
        quantity: 3,
        stockBefore: 20,
        stockAfter: 17,
      });

      expect(movement.productId).toBe(product.id);
      expect(movement.type).toBe("ADJUSTMENT");
      expect(movement.direction).toBe("OUT");
      expect(movement.quantity).toBe(3);
      expect(movement.stockBefore).toBe(20);
      expect(movement.stockAfter).toBe(17);
      expect(movement.saleId).toBeNull();
    });

    it("la quantity siempre es positiva, nunca se guarda con signo", () => {
      const product = createProduct();
      const movement = service.record({
        productId: product.id,
        type: "SALE",
        direction: "OUT",
        quantity: 5,
        stockBefore: 20,
        stockAfter: 15,
      });
      expect(movement.quantity).toBeGreaterThan(0);
    });

    it("rechaza una quantity cero o negativa", () => {
      const product = createProduct();
      expect(() =>
        service.record({
          productId: product.id,
          type: "ADJUSTMENT",
          direction: "OUT",
          quantity: 0,
          stockBefore: 20,
          stockAfter: 20,
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        service.record({
          productId: product.id,
          type: "ADJUSTMENT",
          direction: "OUT",
          quantity: -1,
          stockBefore: 20,
          stockAfter: 21,
        }),
      ).toThrow(BadRequestException);
    });

    it("asocia el requestId del contexto ambiente cuando existe", () => {
      const product = createProduct();

      const movement = RequestContext.run({ requestId: "req-stock-1" }, () =>
        service.record({
          productId: product.id,
          type: "ADJUSTMENT",
          direction: "OUT",
          quantity: 2,
          stockBefore: 20,
          stockAfter: 18,
        }),
      );

      expect(movement.requestId).toBe("req-stock-1");
    });

    it("requestId es null fuera de un contexto de request", () => {
      const product = createProduct();
      const movement = service.record({
        productId: product.id,
        type: "ADJUSTMENT",
        direction: "OUT",
        quantity: 2,
        stockBefore: 20,
        stockAfter: 18,
      });
      expect(movement.requestId).toBeNull();
    });

    it("saleId queda null cuando no aplica (ADJUSTMENT) — el caso con saleId real se cubre en sales-stock-movements.spec.ts", () => {
      const product = createProduct();

      const withoutSale = service.record({
        productId: product.id,
        type: "ADJUSTMENT",
        direction: "OUT",
        quantity: 1,
        stockBefore: 19,
        stockAfter: 18,
      });
      expect(withoutSale.saleId).toBeNull();
    });
  });

  describe("vendedor actual (deviceName override en dispositivos desktop)", () => {
    function recordMovement() {
      const product = createProduct();
      return service.record({
        productId: product.id,
        type: "ADJUSTMENT",
        direction: "OUT",
        quantity: 1,
        stockBefore: 20,
        stockAfter: 19,
      });
    }

    it("un desktop con vendedor configurado snapshotea el nombre del vendedor, no el del equipo", () => {
      const { deviceId } = devicesService.register("Electron Desktop", "desktop", { isAdmin: true });
      devicesService.updateSellerName(deviceId, "Rodrigo");

      const movement = RequestContext.run({ requestId: "req-1" }, () => {
        RequestContext.setDevice({ id: deviceId, name: "Electron Desktop", type: "desktop", sellerName: "Rodrigo" });
        return recordMovement();
      });

      expect(movement.deviceName).toBe("Rodrigo");
      expect(movement.deviceType).toBe("desktop");
    });

    it("un desktop sin vendedor configurado sigue snapshoteando el nombre del equipo", () => {
      const { deviceId } = devicesService.register("Electron Desktop", "desktop", { isAdmin: true });

      const movement = RequestContext.run({ requestId: "req-2" }, () => {
        RequestContext.setDevice({ id: deviceId, name: "Electron Desktop", type: "desktop", sellerName: null });
        return recordMovement();
      });

      expect(movement.deviceName).toBe("Electron Desktop");
    });

    it("mobile ignora sellerName — siempre snapshotea el nombre del dispositivo (mismo comportamiento de siempre)", () => {
      const { deviceId } = devicesService.register("Juan Android", "mobile");

      const movement = RequestContext.run({ requestId: "req-3" }, () => {
        RequestContext.setDevice({
          id: deviceId,
          name: "Juan Android",
          type: "mobile",
          sellerName: "Esto nunca debería usarse",
        });
        return recordMovement();
      });

      expect(movement.deviceName).toBe("Juan Android");
    });
  });

  describe("consultas", () => {
    it("findByProduct devuelve solo los movimientos del producto pedido, más recientes primero", () => {
      const productA = createProduct();
      const productB = createProduct();

      service.record({
        productId: productA.id,
        type: "ADJUSTMENT",
        direction: "OUT",
        quantity: 1,
        stockBefore: 20,
        stockAfter: 19,
      });
      service.record({
        productId: productB.id,
        type: "ADJUSTMENT",
        direction: "OUT",
        quantity: 2,
        stockBefore: 20,
        stockAfter: 18,
      });
      service.record({
        productId: productA.id,
        type: "ADJUSTMENT",
        direction: "IN",
        quantity: 5,
        stockBefore: 19,
        stockAfter: 24,
      });

      const movements = service.findByProduct(productA.id);
      expect(movements).toHaveLength(2);
      expect(movements.every((m) => m.productId === productA.id)).toBe(true);
      expect(movements[0]!.direction).toBe("IN"); // el más reciente primero
    });

    it("findMany filtra por type y direction", () => {
      const product = createProduct();
      service.record({
        productId: product.id,
        type: "SALE",
        direction: "OUT",
        quantity: 1,
        stockBefore: 20,
        stockAfter: 19,
      });
      service.record({
        productId: product.id,
        type: "ADJUSTMENT",
        direction: "IN",
        quantity: 2,
        stockBefore: 19,
        stockAfter: 21,
      });

      expect(service.findMany({ type: "SALE" })).toHaveLength(1);
      expect(service.findMany({ direction: "IN" })).toHaveLength(1);
      expect(service.findMany({ type: "SALE", direction: "IN" })).toHaveLength(0);
    });

    it("findMany filtra por rango de fechas (from/to)", () => {
      const product = createProduct();
      service.record({
        productId: product.id,
        type: "ADJUSTMENT",
        direction: "OUT",
        quantity: 1,
        stockBefore: 20,
        stockAfter: 19,
      });

      const farFuture = new Date(Date.now() + 60_000);
      expect(service.findMany({ from: farFuture })).toHaveLength(0);

      const farPast = new Date(Date.now() - 60_000);
      expect(service.findMany({ from: farPast })).toHaveLength(1);
    });
  });
});
