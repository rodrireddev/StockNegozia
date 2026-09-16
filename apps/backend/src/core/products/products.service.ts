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
import { PurchasesRepository } from "../purchases/purchases.repository";
import { StockMovementsService } from "../stock-movements/stock-movements.service";
import { SuppliersService } from "../suppliers/suppliers.service";
import { ProductsRepository } from "./products.repository";

type ProductRow = ReturnType<ProductsRepository["findById"]>;

/**
 * Prefijo reservado para QR que StockNegozia genere en el futuro (no implementado en este
 * milestone — ver docs/inventory/PRODUCT_SCANNER.md §QR). Si un código escaneado llega con este
 * prefijo, se desenvuelve y se usa el resto como identificador exacto — así un QR propio futuro
 * funciona con este mismo lookup sin cambios adicionales.
 */
const QR_PRODUCT_PREFIX = "STOCKNEGOZIA:PRODUCT:";

/** Mismo `roundMoney` que ya usan `PurchasesService`/`SalesService` (duplicado deliberadamente,
 *  no se introdujo una utilidad monetaria compartida nueva — mismo criterio que esos dos). */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Contexto de negocio opcional para `adjustStock()` — determina qué `type` de stock movement se
 * registra (ver docs/inventory/STOCK_MOVEMENTS.md). Por defecto `"ADJUSTMENT"`: un ajuste sin
 * contexto de negocio más específico (ej. llamado directo, sin pasar por Sales).
 */
export interface AdjustStockOptions {
  type?: StockMovementType;
  /** Venta que origina el ajuste (`SALE`/`SALE_CANCELLATION`) — no aplica a `ADJUSTMENT`/`PURCHASE`. */
  saleId?: number;
  /** Compra que origina el ajuste (`PURCHASE`) — ver docs/inventory/PURCHASES.md. */
  purchaseId?: number;
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
    @Inject(SuppliersService) private readonly suppliersService: SuppliersService,
    @Inject(PurchasesRepository) private readonly purchasesRepository: PurchasesRepository,
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

  /**
   * Lookup exacto para el scanner de productos (QR/barcode) de Mobile — a diferencia de
   * `findMany({ search })`, que hace `LIKE` parcial, acá una coincidencia parcial nunca es
   * suficiente: o hay un producto con ese `sku`/`barcode` exacto, o no se encontró nada. Ver
   * docs/inventory/PRODUCT_SCANNER.md.
   */
  findByCode(code: string): ProductDto {
    const effectiveCode = code.startsWith(QR_PRODUCT_PREFIX)
      ? code.slice(QR_PRODUCT_PREFIX.length)
      : code;
    const row = this.repository.findByCode(effectiveCode);
    if (!row) throw new NotFoundException("Producto no encontrado");
    return toDto(row);
  }

  /**
   * El producto siempre nace con `stock: 0` en `products.repository.insert()` — el stock inicial
   * pedido por el cliente (`input.stock`) nunca se escribe directamente ahí. En cambio, si es
   * mayor a cero, se aplica en la misma transacción vía `adjustStock()` (el único punto de
   * mutación relativa de stock, ver docs/inventory/STOCK_MOVEMENTS.md). Esto es lo que genera el
   * `stock_movement` que antes faltaba (bug corregido en M15): un producto creado con stock
   * inicial > 0 ahora SIEMPRE deja rastro en el historial, en la misma transacción que la
   * creación — si cualquier paso falla, el producto tampoco se crea.
   *
   * Sin stock inicial (`input.stock === 0`, el default del schema) no se llama a `adjustStock()`
   * en absoluto — ni transacción extra ni movimiento de cantidad cero, mismo criterio que ya usa
   * `applyStockAdjustment()` para `delta === 0`.
   *
   * ### Stock inicial → siempre una compra real con proveedor, nunca inventado
   *
   * Si `input.stock > 0`, el proveedor es OBLIGATORIO — no existe un stock inicial "sin origen".
   * Igual que al cargar una compra desde `PurchasesService.create()` (que también exige
   * `supplierId`), la persona debe elegir uno existente (`input.supplierId`) o crear uno nuevo
   * escribiendo su nombre (`input.supplierName`, mismo patrón que `categoryId`/`categoryName`).
   * El backend NUNCA inventa un proveedor (una versión anterior de este cambio creaba uno
   * placeholder "Stock inicial" automáticamente — se descartó por representar mal el origen real
   * de la mercadería) ni permite omitirlo (otra versión lo dejaba opcional — también se descartó:
   * un stock inicial sin proveedor no es un caso de negocio válido en este dominio).
   *
   * Se resuelve/valida vía `resolveSupplier()` y se crea una compra real de un solo ítem
   * (`purchases`/`purchase_items`, `unitCost: purchasePrice`), igual que cualquier compra creada
   * desde `PurchasesService`. El `stock_movement` resultante siempre queda con `purchaseId` real
   * → la UI lo muestra como "Compra #N" con su precio (resuelto vía `purchase_items.unitCost`, ver
   * docs/inventory/STOCK_MOVEMENTS.md §Precio histórico) — nunca "—", porque siempre hay una
   * compra real detrás.
   *
   * La validación se hace ANTES de abrir la transacción (mismo criterio que `assertSkuAvailable`)
   * — un stock inicial sin proveedor nunca debe llegar a tocar la base de datos. El schema Zod
   * (`createProductSchema`, `packages/validation`) ya rechaza esta combinación en el límite HTTP;
   * esto es la misma regla aplicada también a llamadas que no pasen por HTTP.
   *
   * No se usa `PurchasesService.create()` para esto (que exigiría pasar por su propia validación
   * HTTP-oriented y generaría una dependencia circular ProductsModule↔PurchasesModule) — se llama
   * directamente a `PurchasesRepository`/`SuppliersService` dentro de la misma transacción.
   */
  create(input: CreateProductInput): ProductDto {
    this.assertSkuAvailable(input.sku);
    this.assertBarcodeAvailable(input.barcode);
    const categoryId = this.resolveCategoryId(input.categoryId, input.categoryName);

    if (input.stock > 0 && input.supplierId === undefined && !input.supplierName) {
      throw new BadRequestException("El proveedor es obligatorio para registrar el stock inicial");
    }

    const createdId = this.db.transaction((tx) => {
      const created = this.repository.insert(
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
        // Ya validado arriba que hay supplierId o supplierName — `resolveSupplier()` siempre
        // devuelve un proveedor acá, nunca `undefined`.
        const supplier = this.resolveSupplier(input.supplierId, input.supplierName, tx)!;
        const subtotal = roundMoney(input.purchasePrice * input.stock);

        const purchase = this.purchasesRepository.insertPurchase(
          {
            supplierId: supplier.id,
            supplierName: supplier.name,
            total: subtotal,
            createdAt: new Date(),
          },
          tx,
        );
        this.purchasesRepository.insertPurchaseItems(
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

        this.adjustStock(created.id, input.stock, tx, {
          type: "PURCHASE",
          purchaseId: purchase.id,
        });
      }

      return created.id;
    });

    return this.findById(createdId);
  }

  update(id: number, input: UpdateProductInput): ProductDto {
    this.findById(id); // 404 si no existe
    if (input.sku) this.assertSkuAvailable(input.sku, id);
    if (input.barcode) this.assertBarcodeAvailable(input.barcode, id);
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
            purchaseId: options.purchaseId,
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

  /**
   * Mismo criterio que `resolveCategoryId()`, con dos diferencias: acepta un `executor` para poder
   * resolverse dentro de la transacción de `create()` — a diferencia de la categoría (resuelta
   * antes de abrir la transacción), el proveedor del stock inicial sí necesita participar de la
   * misma transacción que la compra/movimiento que genera (ver `create()` §Stock inicial), para
   * que un rollback también deshaga un proveedor recién creado por nombre — y devuelve también el
   * `name` resuelto (no solo el id), porque `purchases.supplierName` necesita el snapshot exacto
   * usado en ese momento (ver database/schema/purchases.ts).
   */
  private resolveSupplier(
    supplierId?: number,
    supplierName?: string,
    executor?: DrizzleExecutor,
  ): { id: number; name: string } | undefined {
    if (supplierName) {
      const supplier = this.suppliersService.findOrCreateByName(supplierName, executor);
      return { id: supplier.id, name: supplier.name };
    }
    if (supplierId !== undefined) {
      const supplier = this.suppliersService.findById(supplierId, executor); // 404 si no existe
      return { id: supplier.id, name: supplier.name };
    }
    return undefined;
  }

  private assertSkuAvailable(sku: string, excludeId?: number): void {
    const existing = this.repository.findBySku(sku);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException("El SKU ya está en uso por otro producto");
    }
  }

  /** Mismo patrón que `assertSkuAvailable` — `barcode` es opcional, así que solo se valida cuando
   *  viene un valor (ver `products.ts`: índice único que sí permite múltiples `NULL`). */
  private assertBarcodeAvailable(barcode: string | undefined, excludeId?: number): void {
    if (!barcode) return;
    const existing = this.repository.findByBarcode(barcode);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `El código de barras ya está en uso por el producto "${existing.name}"`,
      );
    }
  }
}
