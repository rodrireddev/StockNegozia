import { Loader2, Package } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TabNav } from "@/components/ui/tab-nav";
import { ProductsFilterBar, type ProductFiltersState } from "@/features/products/components/ProductsFilterBar";
import { useCategories } from "@/features/products/hooks/useCategories";
import { useDebouncedValue } from "@/features/products/hooks/useDebouncedValue";
import { useProducts } from "@/features/products/hooks/useProducts";
import { InventoryTable } from "../components/InventoryTable";

const DEFAULT_FILTERS: ProductFiltersState = {
  search: "",
  categoryId: undefined,
  status: "active",
  stockStatus: "all",
  sortBy: "name",
  sortDir: "asc",
};

export function InventoryStockPage() {
  const [filters, setFilters] = useState<ProductFiltersState>(DEFAULT_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search);
  const { data: categories = [] } = useCategories();

  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useProducts({ ...filters, search: debouncedSearch || undefined });

  const hasActiveFilters =
    filters.search !== "" ||
    filters.categoryId !== undefined ||
    filters.status !== DEFAULT_FILTERS.status ||
    filters.stockStatus !== DEFAULT_FILTERS.stockStatus;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Inventario</h1>
      <TabNav
        items={[
          { to: "/inventory", label: "Stock", end: true },
          { to: "/inventory/categories", label: "Categorías" },
          { to: "/inventory/movements", label: "Movimientos" },
        ]}
      />

      <ProductsFilterBar
        filters={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        categories={categories}
      />

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando stock…</span>
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">No se pudo cargar el inventario.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {!isLoading && !isError && products && products.length === 0 && !hasActiveFilters && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tenés productos todavía.</p>
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
        <InventoryTable products={products} />
      )}
    </div>
  );
}
