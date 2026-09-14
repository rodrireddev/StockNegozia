import type { ProductDto } from "@stocknegozia/api-contracts";
import type {
  ActiveUpdateInput,
  CreateProductInput,
  ProductQueryInput,
  StockAdjustmentInput,
  UpdateProductInput,
} from "@stocknegozia/validation";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";

function toQueryString(query: Partial<ProductQueryInput>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function fetchProducts(query: Partial<ProductQueryInput>): Promise<ProductDto[]> {
  return apiGet<ProductDto[]>(`/products${toQueryString(query)}`);
}

export function fetchProduct(id: number): Promise<ProductDto> {
  return apiGet<ProductDto>(`/products/${id}`);
}

export function createProduct(input: CreateProductInput): Promise<ProductDto> {
  return apiPost<ProductDto>("/products", input);
}

export function updateProduct(id: number, input: UpdateProductInput): Promise<ProductDto> {
  return apiPatch<ProductDto>(`/products/${id}`, input);
}

export function adjustProductStock(id: number, input: StockAdjustmentInput): Promise<ProductDto> {
  return apiPost<ProductDto>(`/products/${id}/stock-adjustments`, input);
}

export function updateProductActive(id: number, input: ActiveUpdateInput): Promise<ProductDto> {
  return apiPatch<ProductDto>(`/products/${id}/active`, input);
}
