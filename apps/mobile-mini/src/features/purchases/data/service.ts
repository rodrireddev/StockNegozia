import type { PurchaseDto, PurchaseItemDto, PurchaseSummaryDto } from "@stocknegozia/api-contracts";
import type { CreatePurchaseInput, PurchaseItemInput } from "@stocknegozia/validation";
import { db } from "@/database/client";
import { BadRequestError, NotFoundError } from "@/database/errors";
import { productsService } from "@/features/products/data/service";
import { suppliersService } from "@/features/suppliers/data/service";
import { purchasesRepository } from "./repository";

type PurchaseRow = ReturnType<typeof purchasesRepository.findById>;
type PurchaseItemRow = ReturnType<typeof purchasesRepository.findItemsByPurchaseId>[number];

/** Mismo criterio monetario que `productsService`/`salesService` (duplicado a propósito). */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toSummaryDto(row: NonNullable<PurchaseRow>): PurchaseSummaryDto {
  return {
    id: row.id,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    total: row.total,
    createdAt: row.createdAt.toISOString(),
  };
}

function toItemDto(row: PurchaseItemRow): PurchaseItemDto {
  return {
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    unitCost: row.unitCost,
    subtotal: row.subtotal,
  };
}

function assertNoDuplicateProducts(items: PurchaseItemInput[]): void {
  const seen = new Set<number>();
  for (const item of items) {
    if (seen.has(item.productId)) {
      throw new BadRequestError("No se puede repetir el mismo producto dentro de una misma compra");
    }
    seen.add(item.productId);
  }
}

/** Defensa en profundidad además del schema Zod — protege el invariante también para llamadas que
 *  no pasen por un formulario. */
function assertValidItems(items: PurchaseItemInput[]): void {
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new BadRequestError("La cantidad debe ser un número entero mayor a 0");
    }
    if (!Number.isFinite(item.unitCost) || item.unitCost < 0) {
      throw new BadRequestError("El costo unitario no puede ser negativo");
    }
  }
}

/**
 * Compras — mismas reglas que `apps/backend/src/core/purchases/purchases.service.ts`. Crear una
 * compra registra la adquisición Y hace ingresar la mercadería al stock de inmediato: sin
 * órdenes/recepción separada ni estados. Inmutable una vez creada. Toda la escritura de stock pasa
 * por `productsService.adjustStock` — este módulo nunca toca `products.stock` directamente.
 */
export const purchasesService = {
  findMany(filters: { from?: Date; to?: Date } = {}): PurchaseSummaryDto[] {
    return purchasesRepository.findMany(filters).map(toSummaryDto);
  },

  findById(id: number): PurchaseDto {
    const purchase = purchasesRepository.findById(id);
    if (!purchase) throw new NotFoundError("Compra no encontrada");
    const items = purchasesRepository.findItemsByPurchaseId(id);
    return { ...toSummaryDto(purchase), items: items.map(toItemDto) };
  },

  /**
   * Crea la compra completa (cabecera + items + ingreso de stock) en una única transacción —
   * mismo patrón que `salesService.create`: si cualquier paso falla, la excepción revierte todo.
   */
  create(input: CreatePurchaseInput): PurchaseDto {
    // Se valida antes de tocar la base — un duplicado o un item inválido nunca debe abrir una
    // transacción ni iniciar ningún ajuste de stock.
    assertNoDuplicateProducts(input.items);
    assertValidItems(input.items);

    const purchaseId = db.transaction((tx) => {
      const supplier = suppliersService.findById(input.supplierId, tx); // 404 si no existe

      const lines = input.items.map((item) => {
        productsService.findById(item.productId, tx); // 404 si no existe
        const subtotal = roundMoney(item.unitCost * item.quantity);
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          subtotal,
        };
      });

      const total = roundMoney(lines.reduce((sum, line) => sum + line.subtotal, 0));

      const purchase = purchasesRepository.insertPurchase(
        { supplierId: input.supplierId, supplierName: supplier.name, total, createdAt: new Date() },
        tx,
      );
      purchasesRepository.insertPurchaseItems(
        lines.map((line) => ({ ...line, purchaseId: purchase.id })),
        tx,
      );

      for (const line of lines) {
        // Delta siempre positivo: una compra nunca descuenta stock.
        productsService.adjustStock(line.productId, line.quantity, tx, {
          type: "PURCHASE",
          purchaseId: purchase.id,
        });
      }

      return purchase.id;
    });

    return purchasesService.findById(purchaseId);
  },
};
