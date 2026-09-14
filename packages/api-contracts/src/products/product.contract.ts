export interface CategoryDto {
  id: number;
  name: string;
}

export type StockStatus = "normal" | "low" | "out";

export interface ProductDto {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minimumStock: number;
  stockStatus: StockStatus;
  image: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
