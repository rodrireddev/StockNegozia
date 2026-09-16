import type { SaleDto, SaleItemDto, SaleSummaryDto } from "@stocknegozia/api-contracts";
import type { CreateSaleInput, SaleItemInput } from "@stocknegozia/validation";
import { db } from "@/database/client";
import { ConflictError, NotFoundError } from "@/database/errors";
import { productsService } from "@/features/products/data/service";
import type { sales } from "@/database/schema";
import { salesRepository } from "./repository";

type SaleRow = typeof sales.$inferSelect;
type SaleItemRow = ReturnType<typeof salesRepository.findItemsBySaleId>[number];

/** Mismo criterio monetario que `productsService`/`purchasesService` (duplicado a propósito). */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Suma cantidades de items que repiten el mismo producto, para no crear más de una línea por
 *  producto dentro de una misma venta. */
function normalizeItems(items: SaleItemInput[]): SaleItemInput[] {
  const quantitiesByProduct = new Map<number, number>();
  for (const item of items) {
    quantitiesByProduct.set(item.productId, (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity);
  }
  return Array.from(quantitiesByProduct, ([productId, quantity]) => ({ productId, quantity }));
}

function toSummaryDto(row: SaleRow): SaleSummaryDto {
  return {
    id: row.id,
    status: row.status,
    total: row.total,
    createdAt: row.createdAt.toISOString(),
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
  };
}

function toItemDto(row: SaleItemRow): SaleItemDto {
  return {
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    subtotal: row.subtotal,
  };
}

/** Mismas reglas que `apps/backend/src/core/sales/sales.service.ts` — ver ese archivo para el
 *  razonamiento completo. */
export const salesService = {
  findMany(): SaleSummaryDto[] {
    return salesRepository.findMany().map(toSummaryDto);
  },

  findById(id: number): SaleDto {
    const sale = salesRepository.findById(id);
    if (!sale) throw new NotFoundError("Venta no encontrada");
    const items = salesRepository.findItemsBySaleId(id);
    return { ...toSummaryDto(sale), items: items.map(toItemDto) };
  },

  /**
   * Crea la venta completa (cabecera + items + descuento de stock) en una única transacción: si
   * cualquier paso falla (producto inexistente, stock insuficiente), la excepción revierte todo.
   */
  create(input: CreateSaleInput): SaleDto {
    const normalizedItems = normalizeItems(input.items);

    const saleId = db.transaction((tx) => {
      const lines = normalizedItems.map((item) => {
        const product = productsService.findById(item.productId, tx); // 404 si no existe
        const subtotal = roundMoney(product.salePrice * item.quantity);
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.salePrice,
          subtotal,
        };
      });

      const total = roundMoney(lines.reduce((sum, line) => sum + line.subtotal, 0));

      const sale = salesRepository.insertSale({ status: "completed", total, createdAt: new Date() }, tx);
      salesRepository.insertSaleItems(
        lines.map((line) => ({ ...line, saleId: sale.id })),
        tx,
      );

      for (const line of lines) {
        // Lanza ConflictError si no hay stock suficiente — la transacción entera revierte.
        productsService.adjustStock(line.productId, -line.quantity, tx, { type: "SALE", saleId: sale.id });
      }

      return sale.id;
    });

    return salesService.findById(saleId);
  },

  /**
   * Cancela una venta `completed`, restaurando el stock de todos sus items en una única
   * transacción. Una venta ya cancelada no puede volver a cancelarse, y nunca vuelve a
   * `completed`.
   */
  cancel(id: number): SaleDto {
    const saleId = db.transaction((tx) => {
      const sale = salesRepository.findById(id, tx);
      if (!sale) throw new NotFoundError("Venta no encontrada");
      if (sale.status === "cancelled") throw new ConflictError("La venta ya está cancelada");

      const items = salesRepository.findItemsBySaleId(id, tx);
      for (const item of items) {
        // Restaura stock — genera un movimiento nuevo (SALE_CANCELLATION), nunca edita el
        // movimiento SALE original.
        productsService.adjustStock(item.productId, item.quantity, tx, {
          type: "SALE_CANCELLATION",
          saleId: id,
        });
      }

      salesRepository.markCancelled(id, new Date(), tx);
      return id;
    });

    return salesService.findById(saleId);
  },
};
