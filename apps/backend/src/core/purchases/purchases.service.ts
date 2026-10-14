import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PurchaseDto, PurchaseItemDto, PurchaseSummaryDto } from "@stocknegozia/api-contracts";
import type { CreatePurchaseInput, PurchaseItemInput } from "@stocknegozia/validation";
import { AppLogger } from "../../common/logger/app-logger.service";
import { errorLogLevel } from "../../common/logger/error-utils";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database } from "../../database/database.types";
import { ProductsService } from "../products/products.service";
import { SuppliersService } from "../suppliers/suppliers.service";
import { PurchasesRepository } from "./purchases.repository";

type PurchaseRow = ReturnType<PurchasesRepository["findById"]>;
type PurchaseItemRow = ReturnType<PurchasesRepository["findItemsByPurchaseId"]>[number];

/** Evita arrastrar errores de punto flotante al multiplicar costo × cantidad (mismo criterio
 *  monetario que Sales, que ya usa `real`/float para sus montos). */
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

function createRollbackReason(error: unknown): string {
  if (error instanceof NotFoundException) return "not_found";
  if (error instanceof BadRequestException) return "invalid_input";
  return "unexpected_error";
}

function assertNoDuplicateProducts(items: PurchaseItemInput[]): void {
  const seen = new Set<number>();
  for (const item of items) {
    if (seen.has(item.productId)) {
      throw new BadRequestException(
        "No se puede repetir el mismo producto dentro de una misma compra",
      );
    }
    seen.add(item.productId);
  }
}

/**
 * Defensa en profundidad además del schema Zod (mismo criterio que el `reason` obligatorio en
 * `ProductsService.adjustStock()`): protege el invariante también para llamadas que no pasan por
 * el controller/HTTP.
 */
function assertValidItems(items: PurchaseItemInput[]): void {
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new BadRequestException("La cantidad debe ser un número entero mayor a 0");
    }
    if (!Number.isFinite(item.unitCost) || item.unitCost < 0) {
      throw new BadRequestException("El costo unitario no puede ser negativo");
    }
  }
}

/**
 * Compras — ver docs/inventory/PURCHASES.md. En esta primera versión, crear una compra es una
 * única operación que registra la adquisición Y hace ingresar la mercadería al stock de
 * inmediato: no hay órdenes de compra, recepción separada, ni estados. Una compra creada es
 * inmutable (no hay update/cancel en este milestone).
 *
 * Toda la escritura de stock pasa por `ProductsService.adjustStock()` — igual que Sales, este
 * servicio nunca toca `products.stock` directamente ni crea `stock_movements` por su cuenta.
 */
@Injectable()
export class PurchasesService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @Inject(PurchasesRepository) private readonly repository: PurchasesRepository,
    @Inject(SuppliersService) private readonly suppliersService: SuppliersService,
    @Inject(ProductsService) private readonly productsService: ProductsService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  findMany(filters: { from?: Date; to?: Date } = {}): PurchaseSummaryDto[] {
    return this.repository.findMany(filters).map(toSummaryDto);
  }

  findById(id: number): PurchaseDto {
    const purchase = this.repository.findById(id);
    if (!purchase) throw new NotFoundException("Compra no encontrada");
    const items = this.repository.findItemsByPurchaseId(id);
    return { ...toSummaryDto(purchase), items: items.map(toItemDto) };
  }

  /**
   * Crea la compra completa (cabecera + items + ingreso de stock) en una única transacción
   * SQLite — mismo patrón que `SalesService.create()`: si cualquier paso falla (proveedor
   * inexistente, producto inexistente), la excepción revierte todo, incluido el stock ya
   * ajustado de items anteriores dentro del mismo loop.
   */
  create(input: CreatePurchaseInput): PurchaseDto {
    const operation = "createPurchase";

    // Se valida antes de tocar la base — un duplicado o un item inválido nunca debe llegar a
    // abrir una transacción ni a iniciar ningún ajuste de stock.
    assertNoDuplicateProducts(input.items);
    assertValidItems(input.items);

    this.logger.info({
      context: "PurchasesService",
      operation,
      event: "purchase.create.started",
      message: "Creating purchase",
      metadata: { supplierId: input.supplierId, itemCount: input.items.length },
    });

    try {
      this.logger.debug({
        context: "PurchasesService",
        operation,
        event: "transaction.started",
        message: "Transaction started",
        metadata: { transactionType: "purchase.create" },
      });

      const purchaseId = this.db.transaction((tx) => {
        const supplier = this.suppliersService.findById(input.supplierId, tx); // 404 si no existe

        const lines = input.items.map((item) => {
          this.productsService.findById(item.productId, tx); // 404 si no existe
          const subtotal = roundMoney(item.unitCost * item.quantity);
          return {
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            subtotal,
          };
        });

        const total = roundMoney(lines.reduce((sum, line) => sum + line.subtotal, 0));

        const purchase = this.repository.insertPurchase(
          {
            supplierId: input.supplierId,
            supplierName: supplier.name,
            total,
            createdAt: new Date(),
          },
          tx,
        );
        this.repository.insertPurchaseItems(
          lines.map((line) => ({ ...line, purchaseId: purchase.id })),
          tx,
        );

        for (const line of lines) {
          // { type: "PURCHASE", purchaseId } deja el stock movement correlacionado con esta
          // compra (ver docs/inventory/PURCHASES.md). Delta siempre positivo: una compra nunca
          // descuenta stock.
          this.productsService.adjustStock(line.productId, line.quantity, tx, {
            type: "PURCHASE",
            purchaseId: purchase.id,
          });
        }

        return purchase.id;
      });

      this.logger.debug({
        context: "PurchasesService",
        operation,
        event: "transaction.committed",
        message: "Transaction committed",
        metadata: { transactionType: "purchase.create" },
      });

      const dto = this.findById(purchaseId);
      this.logger.info({
        context: "PurchasesService",
        operation,
        event: "purchase.create.completed",
        message: "Purchase created",
        metadata: { purchaseId: dto.id, total: dto.total, itemCount: dto.items.length },
      });
      return dto;
    } catch (error) {
      this.logger.warn({
        context: "PurchasesService",
        operation,
        event: "transaction.rollback",
        message: "Transaction rolled back",
        metadata: { transactionType: "purchase.create", reason: createRollbackReason(error) },
      });

      const failedFields = {
        context: "PurchasesService",
        operation,
        event: "purchase.create.failed",
        message: "Purchase creation failed",
        metadata: { supplierId: input.supplierId, itemCount: input.items.length },
        error,
      };
      if (errorLogLevel(error) === "ERROR") this.logger.error(failedFields);
      else this.logger.warn(failedFields);
      throw error;
    }
  }
}
