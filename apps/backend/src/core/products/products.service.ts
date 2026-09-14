import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { ProductDto, StockStatus } from "@stocknegozia/api-contracts";
import type {
  CreateProductInput,
  ProductQueryInput,
  UpdateProductInput,
} from "@stocknegozia/validation";
import type { DrizzleExecutor } from "../../database/database.types";
import { CategoriesService } from "../categories/categories.service";
import { ProductsRepository } from "./products.repository";

type ProductRow = ReturnType<ProductsRepository["findById"]>;

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
  constructor(
    private readonly repository: ProductsRepository,
    private readonly categoriesService: CategoriesService,
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

  /** Único punto de mutación de stock — futuro punto de inserción de movimientos de stock. */
  updateStock(id: number, stock: number): ProductDto {
    this.findById(id); // 404 si no existe
    if (stock < 0) throw new BadRequestException("El stock no puede ser negativo");
    this.repository.updateStock(id, stock);
    return this.findById(id);
  }

  /**
   * Ajuste relativo de stock (delta positivo = entrada/restauración, negativo = salida), usado
   * por Sales para descontar/restaurar stock dentro de su propia transacción. A diferencia de
   * `updateStock` (que fija un valor absoluto desde la UI), acá el `executor` puede ser el "tx"
   * de una transacción en curso para que la escritura de stock forme parte de esa transacción.
   */
  adjustStock(id: number, delta: number, executor?: DrizzleExecutor): ProductDto {
    const product = this.findById(id, executor); // 404 si no existe
    const applied = this.repository.adjustStock(id, delta, executor);
    if (!applied) {
      throw new ConflictException(`Stock insuficiente para el producto "${product.name}"`);
    }
    return this.findById(id, executor);
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
