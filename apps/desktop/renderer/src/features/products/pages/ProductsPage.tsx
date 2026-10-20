import { Loader2, Package } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { Button } from "@/components/ui/button";
import { ProductsFilterBar, type ProductFiltersState } from "../components/ProductsFilterBar";
import { ProductsTable } from "../components/ProductsTable";
import { useCategories } from "../hooks/useCategories";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useProducts } from "../hooks/useProducts";

const DEFAULT_FILTERS: ProductFiltersState = {
  search: "",
  categoryId: undefined,
  status: "active",
  stockStatus: "all",
  sortBy: "name",
  sortDir: "asc",
};

export function ProductsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ProductFiltersState>(DEFAULT_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search);
  const { data: categories = [] } = useCategories();

  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useProducts({
    ...filters,
    search: debouncedSearch || undefined,
  });

  const hasActiveFilters =
    filters.search !== "" ||
    filters.categoryId !== undefined ||
    filters.status !== DEFAULT_FILTERS.status ||
    filters.stockStatus !== DEFAULT_FILTERS.stockStatus;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Productos</h1>
        <div className="flex gap-2">
          <ExportCsvButton
            fileName="productos"
            rows={products}
            columns={[
              { header: "Nombre", value: (p) => p.name },
              { header: "SKU", value: (p) => p.sku },
              { header: "Código de barras", value: (p) => p.barcode },
              { header: "Categoría", value: (p) => p.categoryName },
              { header: "Precio de costo", value: (p) => p.purchasePrice },
              { header: "Precio de venta", value: (p) => p.salePrice },
              { header: "Stock", value: (p) => p.stock },
              { header: "Stock mínimo", value: (p) => p.minimumStock },
              { header: "Activo", value: (p) => p.active },
            ]}
          />
          <Button onClick={() => navigate("/products/new")}>+ Nuevo producto</Button>
        </div>
      </div>

      <ProductsFilterBar
        filters={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        categories={categories}
      />

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando productos…</span>
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">No se pudo cargar los productos.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {!isLoading && !isError && products && products.length === 0 && !hasActiveFilters && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tenés productos todavía.</p>
          <Button onClick={() => navigate("/products/new")}>+ Crear producto</Button>
        </div>
      )}

      {!isLoading && !isError && products && products.length === 0 && hasActiveFilters && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No se encontraron productos con esos filtros.
          </p>
          <Button variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Limpiar filtros
          </Button>
        </div>
      )}

      {!isLoading && !isError && products && products.length > 0 && (
        <ProductsTable products={products} />
      )}
    </div>
  );
}
