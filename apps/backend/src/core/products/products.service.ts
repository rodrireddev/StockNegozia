import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ProductDto, StockMovementType, StockStatus } from "@stocknegozia/api-contracts";
import type {
  CreateProductInput,
  ProductQueryInput,
  UpdateProductInput,
} from "@stocknegozia/validation";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database, DrizzleExecutor } from "../../database/database.types";
import { AppLogger } from "../../common/logger/app-logger.service";
import { CategoriesService } from "../categories/categories.service";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { ProductsRepository } from "./products.repository";

type ProductRow = ReturnType<ProductsRepository["findById"]>;

/**
 * Contexto de negocio opcional para `adjustStock()` — determina qué `type` de stock movement se
 * registra (ver docs/inventory/STOCK_MOVEMENTS.md). Por defecto `"ADJUSTMENT"`: un ajuste sin
 * contexto de negocio más específico (ej. llamado directo, sin pasar por Sales).
 */
export interface AdjustStockOptions {
  type?: StockMovementType;
  /** Venta que origina el ajuste (`SALE`/`SALE_CANCELLATION`) — no aplica a `ADJUSTMENT`. */
  saleId?: number;
  /** Obligatorio cuando `type` es `ADJUSTMENT` (ver docs/inventory/STOCK_MOVEMENTS.md §reason). */
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

@Injectable()
export class ProductsService {
  // @Inject explícito en todos los parámetros: la inyección automática por tipo de NestJS depende
  // de metadata que `tsc` emite pero esbuild (usado por Vitest) no — ver el mismo comentario en
  // GlobalExceptionFilter.
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    @Inject(ProductsRepository) private readonly repository: ProductsRepository,
    @Inject(CategoriesService) private readonly categoriesService: CategoriesService,
    @Inject(StockMovementsService) private readonly stockMovementsService: StockMovementsService,
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  findMany(query: ProductQueryInput): ProductDto[] {
    return this.repository.findMany(query).map(toDto);
  }

  findById(id: number, executor?: DrizzleExecutor): ProductDto {
    const row = this.repository.findById(id, executor);
    if (!row) throw new NotFoundException("Producto no encontrado");
    return toDto(row);
  }

  create(input: CreateProductInput): ProductDto {
    this.assertSkuAvailable(input.sku);
    const categoryId = this.resolveCategoryId(input.categoryId, input.categoryName);

    const created = this.repository.insert({
      name: input.name,
      sku: input.sku,
      barcode: input.barcode,
      description: input.description,
      categoryId,
      purchasePrice: input.purchasePrice,
      salePrice: input.salePrice,
      stock: input.stock,
      minimumStock: input.minimumStock,
      image: input.image,
      active: input.active,
    });

    return this.findById(created.id);
  }

  update(id: number, input: UpdateProductInput): ProductDto {
    this.findById(id); // 404 si no existe
    if (input.sku) this.assertSkuAvailable(input.sku, id);
    const categoryId = this.resolveCategoryId(input.categoryId, input.categoryName);

    this.repository.update(id, {
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

    return this.findById(id);
  }

  /**
   * API semántica de ajuste manual — ver docs/inventory/STOCK_MOVEMENTS.md. Recibe el stock
   * ABSOLUTO deseado (nunca un delta): calcula `delta = targetStock - stockActual` y lo aplica vía
   * `adjustStock()` (el mecanismo canónico, el único que escribe `products.stock`), con
   * `type: "ADJUSTMENT"` y el `reason` obligatorio. Reemplaza al antiguo `updateStock()`, que
   * escribía `products.stock` directamente sin generar ningún `stock_movement` — esa vía quedó
   * eliminada por completo (repository incluido), no solo desconectada del controller.
   *
   * Si `delta === 0` no hay ningún cambio real que aplicar ni auditar: no se abre transacción, no
   * se toca `products.stock`, no se crea movimiento — se devuelve el producto tal cual está.
   */
  applyStockAdjustment(id: number, targetStock: number, reason: string): ProductDto {
    if (targetStock < 0) throw new BadRequestException("El stock no puede ser negativo");

    const current = this.findById(id); // 404 si no existe
    const delta = targetStock - current.stock;
    if (delta === 0) return current;

    return this.db.transaction((tx) =>
      this.adjustStock(id, delta, tx, { type: "ADJUSTMENT", reason }),
    );
  }

  /**
   * Único punto de mutación relativa de stock (delta positivo = entrada/restauración, negativo =
   * salida) — usado por Sales para descontar/restaurar stock, y por `applyStockAdjustment()` para
   * ajustes manuales, siempre dentro de una transacción. Es el único lugar que registra un
   * `stock_movement` (ver docs/inventory/STOCK_MOVEMENTS.md). El `executor` puede ser el "tx" de
   * una transacción en curso para que la escritura de stock y el movimiento registrado formen
   * parte de la misma transacción atómica.
   */
  adjustStock(
    id: number,
    delta: number,
    executor?: DrizzleExecutor,
    options: AdjustStockOptions = {},
  ): ProductDto {
    const operation = "adjustStock";
    this.logger.debug({
      context: "ProductsService",
      operation,
      event: "stock.adjust.started",
      message: "Adjusting stock",
      metadata: { productId: id, delta },
    });

    try {
      const product = this.findById(id, executor); // 404 si no existe
      const type = options.type ?? "ADJUSTMENT";

      // Se valida ANTES de tocar el repositorio: un ADJUSTMENT sin motivo nunca debe llegar a
      // escribir products.stock, ni siquiera dentro de una transacción que luego revertiría.
      if (delta !== 0 && type === "ADJUSTMENT" && !options.reason?.trim()) {
        throw new BadRequestException("El motivo del ajuste es obligatorio");
      }

      const applied = this.repository.adjustStock(id, delta, executor);
      if (!applied) {
        this.logger.warn({
          context: "ProductsService",
          operation,
          event: "stock.insufficient",
          message: `Insufficient stock for product "${product.name}"`,
          metadata: { productId: id, requested: Math.abs(delta), available: product.stock },
        });
        throw new ConflictException(`Stock insuficiente para el producto "${product.name}"`);
      }

      const updated = this.findById(id, executor);

      // No registrar un movimiento sin cambio real — un delta de 0 no representa nada auditable.
      if (delta !== 0) {
        this.stockMovementsService.record(
          {
            productId: id,
            type,
            direction: delta < 0 ? "OUT" : "IN",
            quantity: Math.abs(delta),
            stockBefore: product.stock,
            stockAfter: updated.stock,
            saleId: options.saleId,
            reason: options.reason,
          },
          executor,
        );
      }

      this.logger.debug({
        context: "ProductsService",
        operation,
        event: "stock.adjust.completed",
        message: "Stock adjusted",
        metadata: { productId: id, delta, stock: updated.stock },
      });
      return updated;
    } catch (error) {
      this.logger.warn({
        context: "ProductsService",
        operation,
        event: "stock.adjust.failed",
        message: "Stock adjustment failed",
        metadata: { productId: id, delta },
      });
      throw error;
    }
  }

  updateActive(id: number, active: boolean): ProductDto {
    this.findById(id); // 404 si no existe
    this.repository.updateActive(id, active);
    return this.findById(id);
  }

  private resolveCategoryId(categoryId?: number, categoryName?: string): number | undefined {
    if (categoryName) {
      return this.categoriesService.findOrCreateByName(categoryName).id;
    }
    return categoryId;
  }

  private assertSkuAvailable(sku: string, excludeId?: number): void {
    const existing = this.repository.findBySku(sku);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException("El SKU ya está en uso por otro producto");
    }
  }
}
