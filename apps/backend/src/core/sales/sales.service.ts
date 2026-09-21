import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { SaleDto, SaleItemDto, SaleSummaryDto } from "@stocknegozia/api-contracts";
import type { CreateSaleInput, SaleItemInput } from "@stocknegozia/validation";
import { AppLogger } from "../../common/logger/app-logger.service";
import { errorLogLevel } from "../../common/logger/error-utils";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database } from "../../database/database.types";
import type { sales } from "../../database/schema";
import { ProductsService } from "../products/products.service";
import { SettingsService } from "../settings/settings.service";
import { renderSaleReceiptPdf } from "./sale-receipt.pdf";
import { SalesRepository } from "./sales.repository";

type SaleRow = typeof sales.$inferSelect;
type SaleItemRow = ReturnType<SalesRepository["findItemsBySaleId"]>[number];

/** Evita arrastrar errores de punto flotante al multiplicar precio × cantidad (mismo criterio
 *  monetario que Products, que ya usa `real`/float para sus precios). */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Suma cantidades de items que repiten el mismo producto, para no crear más de una línea por
 *  producto dentro de una misma venta. */
function normalizeItems(items: SaleItemInput[]): SaleItemInput[] {
  const quantitiesByProduct = new Map<number, number>();
  for (const item of items) {
    quantitiesByProduct.set(
      item.productId,
      (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity,
    );
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

function createRollbackReason(error: unknown): string {
  if (error instanceof ConflictException) return "insufficient_stock";
  if (error instanceof NotFoundException) return "product_not_found";
  return "unexpected_error";
}

function cancelRollbackReason(error: unknown): string {
  if (error instanceof ConflictException) return "already_cancelled";
  if (error instanceof NotFoundException) return "sale_not_found";
  return "unexpected_error";
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

@Injectable()
export class SalesService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    private readonly repository: SalesRepository,
    private readonly productsService: ProductsService,
    private readonly settingsService: SettingsService,
    private readonly logger: AppLogger,
  ) {}

  findMany(): SaleSummaryDto[] {
    return this.repository.findMany().map(toSummaryDto);
  }

  findById(id: number): SaleDto {
    const sale = this.repository.findById(id);
    if (!sale) throw new NotFoundException("Venta no encontrada");
    const items = this.repository.findItemsBySaleId(id);
    return { ...toSummaryDto(sale), items: items.map(toItemDto) };
  }

  /** Genera el PDF del recibo simplificado (no fiscal) de una venta — ver sale-receipt.pdf.ts. */
  async generateReceiptPdf(id: number): Promise<Buffer> {
    const sale = this.repository.findById(id);
    if (!sale) throw new NotFoundException("Venta no encontrada");
    const lines = this.repository.findItemsWithProductBySaleId(id);
    const { businessName } = this.settingsService.get();
    return renderSaleReceiptPdf(sale, lines, businessName ?? "StockNegozia");
  }

  /**
   * Crea la venta completa (cabecera + items + descuento de stock) en una única transacción
   * SQLite: si cualquier paso falla (producto inexistente, stock insuficiente), la excepción
   * revierte todo — no puede quedar una venta parcialmente creada. Validar el producto, tomar su
   * precio actual y descontar stock se hacen todos dentro de la misma transacción (usando el
   * mismo "tx") en vez de pre-validar afuera y repetir la lógica adentro.
   */
  create(input: CreateSaleInput): SaleDto {
    const operation = "createSale";
    const normalizedItems = normalizeItems(input.items);

    this.logger.info({
      context: "SalesService",
      operation,
      event: "sale.create.started",
      message: "Creating sale",
      metadata: { itemCount: normalizedItems.length },
    });

    try {
      this.logger.debug({
        context: "SalesService",
        operation,
        event: "transaction.started",
        message: "Transaction started",
        metadata: { transactionType: "sale.create" },
      });

      const saleId = this.db.transaction((tx) => {
        const lines = normalizedItems.map((item) => {
          const product = this.productsService.findById(item.productId, tx); // 404 si no existe
          const subtotal = roundMoney(product.salePrice * item.quantity);
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: product.salePrice,
            // Snapshot histórico del costo — ver comentario en el schema (`sale_items.unitCost`).
            unitCost: product.purchasePrice,
            subtotal,
          };
        });

        const total = roundMoney(lines.reduce((sum, line) => sum + line.subtotal, 0));

        const sale = this.repository.insertSale(
          { status: "completed", total, createdAt: new Date() },
          tx,
        );
        this.repository.insertSaleItems(
          lines.map((line) => ({ ...line, saleId: sale.id })),
          tx,
        );

        for (const line of lines) {
          // Lanza ConflictException si no hay stock suficiente — la transacción entera revierte.
          // { type: "SALE", saleId } deja el stock movement correlacionado con esta venta (ver
          // docs/inventory/STOCK_MOVEMENTS.md).
          this.productsService.adjustStock(line.productId, -line.quantity, tx, {
            type: "SALE",
            saleId: sale.id,
          });
        }

        return sale.id;
      });

      this.logger.debug({
        context: "SalesService",
        operation,
        event: "transaction.committed",
        message: "Transaction committed",
        metadata: { transactionType: "sale.create" },
      });

      const dto = this.findById(saleId);
      this.logger.info({
        context: "SalesService",
        operation,
        event: "sale.create.completed",
        message: "Sale created",
        metadata: { saleId: dto.id, total: dto.total, itemCount: dto.items.length },
      });
      return dto;
    } catch (error) {
      this.logger.warn({
        context: "SalesService",
        operation,
        event: "transaction.rollback",
        message: "Transaction rolled back",
        metadata: { transactionType: "sale.create", reason: createRollbackReason(error) },
      });

      const failedFields = {
        context: "SalesService",
        operation,
        event: "sale.create.failed",
        message: "Sale creation failed",
        metadata: { itemCount: normalizedItems.length },
        error,
      };
      if (errorLogLevel(error) === "ERROR") this.logger.error(failedFields);
      else this.logger.warn(failedFields);
      throw error;
    }
  }

  /**
   * Cancela una venta `completed`, restaurando el stock de todos sus items — también como una
   * única transacción. Una venta ya cancelada no puede volver a cancelarse (evita restaurar
   * stock dos veces), y una venta cancelada nunca vuelve a `completed`.
   */
  cancel(id: number): SaleDto {
    const operation = "cancelSale";

    this.logger.info({
      context: "SalesService",
      operation,
      event: "sale.cancel.started",
      message: "Cancelling sale",
      metadata: { saleId: id },
    });

    try {
      this.logger.debug({
        context: "SalesService",
        operation,
        event: "transaction.started",
        message: "Transaction started",
        metadata: { transactionType: "sale.cancel", saleId: id },
      });

      const saleId = this.db.transaction((tx) => {
        const sale = this.repository.findById(id, tx);
        if (!sale) throw new NotFoundException("Venta no encontrada");
        if (sale.status === "cancelled") {
          throw new ConflictException("La venta ya está cancelada");
        }

        const items = this.repository.findItemsBySaleId(id, tx);
        for (const item of items) {
          // Restaura stock — genera un movimiento nuevo (SALE_CANCELLATION), nunca edita el
          // movimiento SALE original (ver docs/inventory/STOCK_MOVEMENTS.md §Cancelación).
          this.productsService.adjustStock(item.productId, item.quantity, tx, {
            type: "SALE_CANCELLATION",
            saleId: id,
          });
        }

        this.repository.markCancelled(id, new Date(), tx);
        return id;
      });

      this.logger.debug({
        context: "SalesService",
        operation,
        event: "transaction.committed",
        message: "Transaction committed",
        metadata: { transactionType: "sale.cancel", saleId: id },
      });

      const dto = this.findById(saleId);
      this.logger.info({
        context: "SalesService",
        operation,
        event: "sale.cancel.completed",
        message: "Sale cancelled",
        metadata: { saleId: dto.id },
      });
      return dto;
    } catch (error) {
      this.logger.warn({
        context: "SalesService",
        operation,
        event: "transaction.rollback",
        message: "Transaction rolled back",
        metadata: {
          transactionType: "sale.cancel",
          saleId: id,
          reason: cancelRollbackReason(error),
        },
      });

      const failedFields = {
        context: "SalesService",
        operation,
        event: "sale.cancel.failed",
        message: "Sale cancellation failed",
        metadata: { saleId: id },
        error,
      };
      if (errorLogLevel(error) === "ERROR") this.logger.error(failedFields);
      else this.logger.warn(failedFields);
      throw error;
    }
  }
}
