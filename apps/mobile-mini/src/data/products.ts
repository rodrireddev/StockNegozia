import type { ProductDto } from "@stocknegozia/api-contracts";
import type {
  ActiveUpdateInput,
  CreateProductInput,
  ProductQueryInput,
  StockAdjustmentInput,
  UpdateProductInput,
} from "@stocknegozia/validation";
import { productQuerySchema } from "@stocknegozia/validation";
import { productsService } from "@/features/products/data/service";

/**
 * Mismas firmas que `apps/mobile/src/api/endpoints/products.ts` (`fetchProducts`, `createProduct`,
 * etc.) pero contra la capa de datos local en vez de HTTP — así los hooks de
 * `features/products/hooks/*` se copian del cliente completo (`apps/mobile`) cambiando solo el
 * import. `async` por consistencia con la firma `Promise<T>` que ya esperan esos hooks/React Query.
 */
export async function fetchProducts(query: Partial<ProductQueryInput> = {}): Promise<ProductDto[]> {
  return productsService.findMany(productQuerySchema.parse(query));
}

export async function fetchProduct(id: number): Promise<ProductDto> {
  return productsService.findById(id);
}

/** Lookup exacto por código escaneado (QR o barcode) o tipeado — ver `productsService.findByCode`. */
export async function fetchProductByCode(code: string): Promise<ProductDto> {
  return productsService.findByCode(code);
}

export async function createProduct(input: CreateProductInput): Promise<ProductDto> {
  return productsService.create(input);
}

export async function updateProduct(id: number, input: UpdateProductInput): Promise<ProductDto> {
  return productsService.update(id, input);
}

export async function adjustProductStock(
  id: number,
  input: StockAdjustmentInput,
): Promise<ProductDto> {
  return productsService.applyStockAdjustment(id, input.stock, input.reason);
}

export async function updateProductActive(
  id: number,
  input: ActiveUpdateInput,
): Promise<ProductDto> {
  return productsService.updateActive(id, input.active);
}
