import { beforeEach, describe, expect, it, vi } from "vitest";
import { CredentialService } from "../../auth/credential/credential.service";
import { DevicesRepository } from "../../auth/devices/devices.repository";
import { DevicesService } from "../../auth/devices/devices.service";
import { RequestContext } from "../../common/logger/request-context";
import { createSilentTestLogger } from "../../test/create-test-logger";
import { createTestDb } from "../../test/create-test-db";
import type { Database } from "../../database/database.types";
import { CategoriesRepository } from "../categories/categories.repository";
import { CategoriesService } from "../categories/categories.service";
import { PurchasesRepository } from "../purchases/purchases.repository";
import { PurchasesService } from "../purchases/purchases.service";
import { StockMovementsRepository } from "../stock-movements/stock-movements.repository";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { SuppliersService } from "../suppliers/suppliers.service";
import { ProductsRepository } from "./products.repository";
import { ProductsService } from "./products.service";

/**
 * M15 — bug corregido: crear un producto con stock inicial > 0 modificaba `products.stock` pero
 * nunca dejaba rastro en `stock_movements` (bypass del mecanismo canónico de auditoría, ver
 * docs/inventory/STOCK_MOVEMENTS.md). Este archivo cubre específicamente ese flujo — el resto del
 * comportamiento de `ProductsService.create()` (SKU duplicado, categoría, etc.) sigue cubierto en
 * otros specs, sin cambios.
 *
 * También cubre la trazabilidad de actor/dispositivo agregada en la misma corrección: el
 * `stock_movement` generado (de cualquier tipo, no solo el de creación) ahora registra qué
 * dispositivo autenticado originó la operación, resuelto siempre desde `RequestContext` — nunca
 * de un valor provisto por el llamador.
 *
 * Y cubre que el stock inicial siempre queda asociado a una compra real, con un proveedor elegido
 * por la persona (`input.supplierId`/`input.supplierName`, igual que en
 * `PurchasesService.create()`) — nunca uno inventado por el backend, y nunca ausente: un stock
 * inicial sin proveedor se rechaza (ver `ProductsService.create()` §Stock inicial).
 */
describe("ProductsService.create — stock inicial", () => {
  let db: Database;
  let productsService: ProductsService;
  let productsRepository: ProductsRepository;
  let stockMovementsService: StockMovementsService;
  let stockMovementsRepository: StockMovementsRepository;
  let suppliersService: SuppliersService;
  let suppliersRepository: SuppliersRepository;
  let purchasesService: PurchasesService;
  let devicesService: DevicesService;

  beforeEach(() => {
    db = createTestDb();
    const logger = createSilentTestLogger();
    const categoriesService = new CategoriesService(new CategoriesRepository(db));
    stockMovementsRepository = new StockMovementsRepository(db);
    stockMovementsService = new StockMovementsService(stockMovementsRepository, logger);
    productsRepository = new ProductsRepository(db);
    suppliersRepository = new SuppliersRepository(db);
    suppliersService = new SuppliersService(suppliersRepository);
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
    // `stock_movements.device_id` es una FK real hacia `devices.id` (ver
    // database/schema/stock-movements.ts) — los tests de trazabilidad de actor/dispositivo
    // necesitan un `Device` real registrado, no un id inventado.
    devicesService = new DevicesService(new DevicesRepository(db), new CredentialService(), logger);
  });

  function createSupplier(name = "ACME") {
    return suppliersService.create({ name });
  }

  function createProductInput(
    overrides: Partial<{
      stock: number;
      sku: string;
      supplierId: number;
      supplierName: string;
    }> = {},
  ) {
    return {
      name: "Producto de prueba",
      sku: overrides.sku ?? `SKU-${Math.random().toString(36).slice(2)}`,
      purchasePrice: 500,
      salePrice: 1000,
      stock: overrides.stock ?? 0,
      supplierId: overrides.supplierId,
      supplierName: overrides.supplierName,
      minimumStock: 0,
      active: true,
    };
  }

  describe("stock inicial > 0, sin proveedor", () => {
    it("rechaza la creación: un stock inicial sin proveedor no es un caso de negocio válido", () => {
      const sku = `SKU-${Math.random().toString(36).slice(2)}`;
      expect(() => productsService.create(createProductInput({ stock: 20, sku }))).toThrow();

      // No se creó nada: ni producto, ni proveedor, ni movimiento — la validación corre antes de
      // abrir la transacción.
      expect(productsRepository.findBySku(sku)).toBeUndefined();
      expect(suppliersRepository.findAll()).toHaveLength(0);
    });

    it("también rechaza cuando supplierName llega vacío/solo espacios (equivale a no elegir proveedor)", () => {
      expect(() =>
        productsService.create(createProductInput({ stock: 10, supplierName: "" })),
      ).toThrow();
    });
  });

  describe("stock inicial > 0, con proveedor elegido", () => {
    it("registra el stock inicial como una compra real con el proveedor elegido, no uno inventado", () => {
      const supplier = createSupplier("Distribuidora Sur");
      const product = productsService.create(
        createProductInput({ stock: 20, supplierId: supplier.id }),
      );

      const [movement] = stockMovementsService.findByProduct(product.id);
      expect(movement).toMatchObject({
        type: "PURCHASE",
        purchaseId: expect.any(Number),
        unitValue: 500, // = purchasePrice del producto, vía la compra real
      });

      const purchase = purchasesService.findById(movement!.purchaseId!);
      expect(purchase.supplierId).toBe(supplier.id);
      expect(purchase.supplierName).toBe("Distribuidora Sur");
      expect(purchase.total).toBe(20 * 500);
      expect(purchase.items).toHaveLength(1);
      expect(purchase.items[0]).toMatchObject({
        productId: product.id,
        quantity: 20,
        unitCost: 500,
        subtotal: 10_000,
      });
    });

    it("renombrar el proveedor después no reescribe el snapshot guardado en la compra", () => {
      const supplier = createSupplier("Distribuidora Sur");
      const product = productsService.create(
        createProductInput({ stock: 20, supplierId: supplier.id }),
      );
      const [movement] = stockMovementsService.findByProduct(product.id);

      suppliersService.update(supplier.id, { name: "Distribuidora Sur SA" });

      const purchase = purchasesService.findById(movement!.purchaseId!);
      expect(purchase.supplierName).toBe("Distribuidora Sur");
      expect(suppliersService.findById(supplier.id).name).toBe("Distribuidora Sur SA");
    });

    it("proveedor inexistente: falla, no crea el producto ni ningún movimiento", () => {
      const sku = `SKU-${Math.random().toString(36).slice(2)}`;
      expect(() =>
        productsService.create(createProductInput({ stock: 10, supplierId: 999_999, sku })),
      ).toThrow();

      expect(productsRepository.findBySku(sku)).toBeUndefined();
      expect(purchasesService.findMany()).toHaveLength(0);
    });

    it("atomicidad: si falla el registro del movimiento, ni el producto ni la compra quedan creados", () => {
      const supplier = createSupplier();
      vi.spyOn(stockMovementsRepository, "insert").mockImplementation(() => {
        throw new Error("fallo simulado al crear el stock movement");
      });

      const sku = `SKU-${Math.random().toString(36).slice(2)}`;
      expect(() =>
        productsService.create(createProductInput({ stock: 20, sku, supplierId: supplier.id })),
      ).toThrow();

      // Ni el producto, ni la compra, ni el movimiento quedaron persistidos — todo o nada.
      expect(productsRepository.findBySku(sku)).toBeUndefined();
      expect(purchasesService.findMany()).toHaveLength(0);
    });

    it("el movimiento inicial respeta el requestId del contexto ambiente, igual que el resto de movimientos", () => {
      const supplier = createSupplier();
      const product = RequestContext.run({ requestId: "req-create-1" }, () =>
        productsService.create(createProductInput({ stock: 10, supplierId: supplier.id })),
      );

      const [movement] = stockMovementsService.findByProduct(product.id);
      expect(movement!.requestId).toBe("req-create-1");
    });

    it("requestId es null cuando la creación ocurre fuera de un contexto HTTP", () => {
      const supplier = createSupplier();
      const product = productsService.create(
        createProductInput({ stock: 10, supplierId: supplier.id }),
      );
      const [movement] = stockMovementsService.findByProduct(product.id);
      expect(movement!.requestId).toBeNull();
    });
  });

  describe("stock inicial > 0, con proveedor nuevo escrito a mano (supplierName)", () => {
    it("crea el proveedor con el nombre tipeado y arma la compra con él, mismo patrón que categoryName", () => {
      const product = productsService.create(
        createProductInput({ stock: 20, supplierName: "Distribuidora Nueva" }),
      );

      const suppliers = suppliersRepository.findAll();
      expect(suppliers).toHaveLength(1);
      expect(suppliers[0]!.name).toBe("Distribuidora Nueva");

      const [movement] = stockMovementsService.findByProduct(product.id);
      const purchase = purchasesService.findById(movement!.purchaseId!);
      expect(purchase.supplierName).toBe("Distribuidora Nueva");
      expect(purchase.total).toBe(20 * 500);
    });

    it("reutiliza un proveedor existente si el nombre tipeado coincide, no crea uno duplicado", () => {
      const existing = createSupplier("Distribuidora Sur");

      const product = productsService.create(
        createProductInput({ stock: 10, supplierName: "Distribuidora Sur" }),
      );

      expect(suppliersRepository.findAll()).toHaveLength(1);
      const [movement] = stockMovementsService.findByProduct(product.id);
      const purchase = purchasesService.findById(movement!.purchaseId!);
      expect(purchase.supplierId).toBe(existing.id);
    });

    it("supplierName tiene prioridad sobre supplierId si ambos llegan (mismo criterio que categoryName/categoryId)", () => {
      const existing = createSupplier("Proveedor Viejo");

      const product = productsService.create(
        createProductInput({ stock: 10, supplierId: existing.id, supplierName: "Proveedor Nuevo" }),
      );

      const [movement] = stockMovementsService.findByProduct(product.id);
      const purchase = purchasesService.findById(movement!.purchaseId!);
      expect(purchase.supplierName).toBe("Proveedor Nuevo");
    });

    it("atomicidad: si falla el movimiento, tampoco queda creado el proveedor nuevo por nombre", () => {
      vi.spyOn(stockMovementsRepository, "insert").mockImplementation(() => {
        throw new Error("fallo simulado al crear el stock movement");
      });

      expect(() =>
        productsService.create(createProductInput({ stock: 20, supplierName: "Nunca Creado" })),
      ).toThrow();

      expect(suppliersRepository.findAll()).toHaveLength(0);
    });
  });

  describe("stock inicial = 0", () => {
    it("no genera ningún movimiento de stock", () => {
      const product = productsService.create(createProductInput({ stock: 0 }));
      expect(product.stock).toBe(0);
      expect(stockMovementsService.findByProduct(product.id)).toHaveLength(0);
    });

    it("el stock por defecto del schema (sin especificarlo) también se comporta como 0", () => {
      // `createProductSchema` resuelve `stock` a 0 por defecto — a nivel de servicio eso ya llega
      // como `stock: 0` explícito, así que este caso coincide con el anterior. Se deja como test
      // separado para dejar explícito el criterio de aceptación "stock inicial = 0 → sin PURCHASE".
      const product = productsService.create(createProductInput({ stock: 0 }));
      expect(stockMovementsService.findByProduct(product.id)).toHaveLength(0);
    });
  });

  describe("trazabilidad de actor/dispositivo", () => {
    it("asocia el dispositivo autenticado del contexto ambiente al movimiento generado", () => {
      const supplier = createSupplier();
      const { deviceId } = devicesService.register("Electron Desktop", "desktop", {
        isAdmin: true,
      });

      const product = RequestContext.run(
        {
          requestId: "req-device-1",
          device: { id: deviceId, name: "Electron Desktop", type: "desktop" },
        },
        () => productsService.create(createProductInput({ stock: 5, supplierId: supplier.id })),
      );

      const [movement] = stockMovementsService.findByProduct(product.id);
      expect(movement).toMatchObject({
        deviceId,
        deviceName: "Electron Desktop",
        deviceType: "desktop",
      });
    });

    it("identifica un dispositivo Mobile de la misma forma que un dispositivo Desktop", () => {
      const supplier = createSupplier();
      const { deviceId } = devicesService.register("Juan Android", "mobile");

      const product = RequestContext.run(
        {
          requestId: "req-device-2",
          device: { id: deviceId, name: "Juan Android", type: "mobile" },
        },
        () => productsService.create(createProductInput({ stock: 5, supplierId: supplier.id })),
      );

      const [movement] = stockMovementsService.findByProduct(product.id);
      expect(movement).toMatchObject({
        deviceId,
        deviceName: "Juan Android",
        deviceType: "mobile",
      });
    });

    it("sin dispositivo en el contexto (ej. sin autenticación), deviceId/deviceName/deviceType quedan null — nunca inventados", () => {
      const supplier = createSupplier();
      const product = RequestContext.run({ requestId: "req-no-device" }, () =>
        productsService.create(createProductInput({ stock: 5, supplierId: supplier.id })),
      );

      const [movement] = stockMovementsService.findByProduct(product.id);
      expect(movement).toMatchObject({ deviceId: null, deviceName: null, deviceType: null });
    });

    it("fuera de un contexto HTTP, deviceId/deviceName/deviceType también quedan null", () => {
      const supplier = createSupplier();
      const product = productsService.create(
        createProductInput({ stock: 5, supplierId: supplier.id }),
      );
      const [movement] = stockMovementsService.findByProduct(product.id);
      expect(movement).toMatchObject({ deviceId: null, deviceName: null, deviceType: null });
    });

    it("no persiste credentials/tokens/secrets en el movimiento — solo id/nombre/tipo del dispositivo", () => {
      const supplier = createSupplier();
      const { deviceId } = devicesService.register("Electron Desktop", "desktop", {
        isAdmin: true,
      });

      const product = RequestContext.run(
        {
          requestId: "req-device-3",
          device: { id: deviceId, name: "Electron Desktop", type: "desktop" },
        },
        () => productsService.create(createProductInput({ stock: 5, supplierId: supplier.id })),
      );

      const [movement] = stockMovementsService.findByProduct(product.id);
      const keys = Object.keys(movement!);
      expect(keys).not.toContain("credential");
      expect(keys).not.toContain("credentialHash");
      expect(keys).not.toContain("token");
      expect(keys).not.toContain("authorization");
    });
  });
});
