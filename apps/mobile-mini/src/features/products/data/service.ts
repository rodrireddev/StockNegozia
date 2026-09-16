import type { ProductDto, StockMovementType, StockStatus } from "@stocknegozia/api-contracts";
import type { CreateProductInput, ProductQueryInput, UpdateProductInput } from "@stocknegozia/validation";
import { db } from "@/database/client";
import type { DrizzleExecutor } from "@/database/database.types";
import { BadRequestError, ConflictError, NotFoundError } from "@/database/errors";
import { categoriesService } from "@/features/categories/data/service";
import { purchasesRepository } from "@/features/purchases/data/repository";
import { stockMovementsService } from "@/features/inventory/data/stock-movements.service";
import { suppliersService } from "@/features/suppliers/data/service";
import { productsRepository } from "./repository";

type ProductRow = ReturnType<typeof productsRepository.findById>;

/** Prefijo reservado para un QR propio futuro — ver
 *  `apps/backend/src/core/products/products.service.ts`. Si llega, se desenvuelve y se usa el
 *  resto como identificador exacto. */
const QR_PRODUCT_PREFIX = "STOCKNEGOZIA:PRODUCT:";

/** Mismo `roundMoney` que `salesService`/`purchasesService` (duplicado a propósito, no hay una
 *  utilidad monetaria compartida — mismo criterio que el backend). */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Contexto de negocio opcional para `adjustStock()` — determina qué `type` de stock movement se
 *  registra. Por defecto `"ADJUSTMENT"`. */
export interface AdjustStockOptions {
  type?: StockMovementType;
  saleId?: number;
  purchaseId?: number;
  reason?: string;
}

function computeStockStatus(stock: number, minimumStock: number): StockStatus {
  if (stock <= 0) return "out";
  if (stock <= minimumStock) return "low";
  return "normal";
}

function toDto(row: NonNullable<ProductRow>): ProductDto {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    description: row.description,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    purchasePrice: row.purchasePrice,
    salePrice: row.salePrice,
    stock: row.stock,
    minimumStock: row.minimumStock,
    stockStatus: computeStockStatus(row.stock, row.minimumStock),
    image: row.image,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function resolveCategoryId(categoryId?: number, categoryName?: string): number | undefined {
  if (categoryName) return categoriesService.findOrCreateByName(categoryName).id;
  return categoryId;
}

/** A diferencia de `resolveCategoryId` (resuelta antes de abrir la transacción), el proveedor del
 *  stock inicial sí participa de la misma transacción que la compra/movimiento que genera, para
 *  que un rollback también deshaga un proveedor recién creado por nombre. */
function resolveSupplier(
  supplierId: number | undefined,
  supplierName: string | undefined,
  executor: DrizzleExecutor,
): { id: number; name: string } | undefined {
  if (supplierName) {
    const supplier = suppliersService.findOrCreateByName(supplierName, executor);
    return { id: supplier.id, name: supplier.name };
  }
  if (supplierId !== undefined) {
    const supplier = suppliersService.findById(supplierId, executor); // 404 si no existe
    return { id: supplier.id, name: supplier.name };
  }
  return undefined;
}

function assertSkuAvailable(sku: string, excludeId?: number): void {
  const existing = productsRepository.findBySku(sku);
  if (existing && existing.id !== excludeId) {
    throw new ConflictError("El SKU ya está en uso por otro producto");
  }
}

/** `barcode` es opcional — solo se valida cuando viene un valor (el índice único permite múltiples
 *  `NULL`). */
function assertBarcodeAvailable(barcode: string | undefined, excludeId?: number): void {
  if (!barcode) return;
  const existing = productsRepository.findByBarcode(barcode);
  if (existing && existing.id !== excludeId) {
    throw new ConflictError(`El código de barras ya está en uso por el producto "${existing.name}"`);
  }
}

/** Mismas reglas que `apps/backend/src/core/products/products.service.ts` — ver ese archivo para
 *  el razonamiento completo detrás de cada invariante. */
export const productsService = {
  findMany(query: ProductQueryInput): ProductDto[] {
    return productsRepository.findMany(query).map(toDto);
  },

  findById(id: number, executor?: DrizzleExecutor): ProductDto {
    const row = productsRepository.findById(id, executor);
    if (!row) throw new NotFoundError("Producto no encontrado");
    return toDto(row);
  },

  /** Lookup exacto para el scanner (QR/barcode) — a diferencia de `findMany({ search })` (LIKE
   *  parcial), acá una coincidencia parcial nunca alcanza. */
  findByCode(code: string): ProductDto {
    const effectiveCode = code.startsWith(QR_PRODUCT_PREFIX)
      ? code.slice(QR_PRODUCT_PREFIX.length)
      : code;
    const row = productsRepository.findByCode(effectiveCode);
    if (!row) throw new NotFoundError("Producto no encontrado");
    return toDto(row);
  },

  /**
   * El producto siempre nace con `stock: 0` — el stock inicial pedido (`input.stock`) nunca se
   * escribe directamente. Si es mayor a cero, se aplica en la misma transacción vía
   * `adjustStock()`, generando una Compra real (nunca un proveedor/origen inventado) y su
   * `stock_movement` correlacionado. Ver `products.service.ts` del backend para el detalle
   * completo de este invariante.
   */
  create(input: CreateProductInput): ProductDto {
    assertSkuAvailable(input.sku);
    assertBarcodeAvailable(input.barcode);
    const categoryId = resolveCategoryId(input.categoryId, input.categoryName);

    if (input.stock > 0 && input.supplierId === undefined && !input.supplierName) {
      throw new BadRequestError("El proveedor es obligatorio para registrar el stock inicial");
    }

    const createdId = db.transaction((tx) => {
      const created = productsRepository.insert(
        {
          name: input.name,
          sku: input.sku,
          barcode: input.barcode,
          description: input.description,
          categoryId,
          purchasePrice: input.purchasePrice,
          salePrice: input.salePrice,
          stock: 0,
          minimumStock: input.minimumStock,
          image: input.image,
          active: input.active,
        },
        tx,
      );

      if (input.stock > 0) {
        // Ya validado arriba que hay supplierId o supplierName.
        const supplier = resolveSupplier(input.supplierId, input.supplierName, tx)!;
        const subtotal = roundMoney(input.purchasePrice * input.stock);

        const purchase = purchasesRepository.insertPurchase(
          { supplierId: supplier.id, supplierName: supplier.name, total: subtotal, createdAt: new Date() },
          tx,
        );
        purchasesRepository.insertPurchaseItems(
          [
            {
              purchaseId: purchase.id,
              productId: created.id,
              quantity: input.stock,
              unitCost: input.purchasePrice,
              subtotal,
            },
          ],
          tx,
        );

        productsService.adjustStock(created.id, input.stock, tx, {
          type: "PURCHASE",
          purchaseId: purchase.id,
        });
      }

      return created.id;
    });

    return productsService.findById(createdId);
  },

  update(id: number, input: UpdateProductInput): ProductDto {
    productsService.findById(id); // 404 si no existe
    if (input.sku) assertSkuAvailable(input.sku, id);
    if (input.barcode) assertBarcodeAvailable(input.barcode, id);
    const categoryId = resolveCategoryId(input.categoryId, input.categoryName);

    productsRepository.update(id, {
      name: input.name,
      sku: input.sku,
      barcode: input.barcode,
      description: input.description,
      categoryId,
      purchasePrice: input.purchasePrice,
      salePrice: input.salePrice,
      minimumStock: input.minimumStock,
      image: input.image,
      active: input.active,
    });

    return productsService.findById(id);
  },

  /**
   * API semántica de ajuste manual — recibe el stock ABSOLUTO deseado (nunca un delta):
   * `delta = targetStock - stockActual`, aplicado vía `adjustStock()` con `type: "ADJUSTMENT"` y
   * `reason` obligatorio. `delta === 0` no genera transacción ni movimiento.
   */
  applyStockAdjustment(id: number, targetStock: number, reason: string): ProductDto {
    if (targetStock < 0) throw new BadRequestError("El stock no puede ser negativo");

    const current = productsService.findById(id); // 404 si no existe
    const delta = targetStock - current.stock;
    if (delta === 0) return current;

    return db.transaction((tx) => productsService.adjustStock(id, delta, tx, { type: "ADJUSTMENT", reason }));
  },

  /**
   * Único punto de mutación relativa de stock (delta positivo = entrada/restauración, negativo =
   * salida). Es el único lugar que registra un `stock_movement`. `executor` puede ser el "tx" de
   * una transacción en curso para que la escritura de stock y el movimiento formen parte de la
   * misma transacción atómica.
   */
  adjustStock(
    id: number,
    delta: number,
    executor?: DrizzleExecutor,
    options: AdjustStockOptions = {},
  ): ProductDto {
    const product = productsService.findById(id, executor); // 404 si no existe
    const type = options.type ?? "ADJUSTMENT";

    // Se valida ANTES de tocar el repositorio: un ADJUSTMENT sin motivo nunca debe llegar a
    // escribir products.stock, ni siquiera dentro de una transacción que luego revertiría.
    if (delta !== 0 && type === "ADJUSTMENT" && !options.reason?.trim()) {
      throw new BadRequestError("El motivo del ajuste es obligatorio");
    }

    const applied = productsRepository.adjustStock(id, delta, executor);
    if (!applied) {
      throw new ConflictError(`Stock insuficiente para el producto "${product.name}"`);
    }

    const updated = productsService.findById(id, executor);

    // No registrar un movimiento sin cambio real — un delta de 0 no representa nada auditable.
    if (delta !== 0) {
      stockMovementsService.record(
        {
          productId: id,
          type,
          direction: delta < 0 ? "OUT" : "IN",
          quantity: Math.abs(delta),
          stockBefore: product.stock,
          stockAfter: updated.stock,
          saleId: options.saleId,
          purchaseId: options.purchaseId,
          reason: options.reason,
        },
        executor,
      );
    }

    return updated;
  },

  updateActive(id: number, active: boolean): ProductDto {
    productsService.findById(id); // 404 si no existe
    productsRepository.updateActive(id, active);
    return productsService.findById(id);
  },
};
