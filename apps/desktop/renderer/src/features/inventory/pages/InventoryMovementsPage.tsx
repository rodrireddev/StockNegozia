import { History, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TabNav } from "@/components/ui/tab-nav";
import { useProducts } from "@/features/products/hooks/useProducts";
import { MovementsFilterBar, type MovementsFiltersState } from "../components/MovementsFilterBar";
import { MovementsTable } from "../components/MovementsTable";
import { useStockMovements } from "../hooks/useStockMovements";

const DEFAULT_FILTERS: MovementsFiltersState = { type: "", direction: "" };

export function InventoryMovementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<MovementsFiltersState>(DEFAULT_FILTERS);

  const productIdParam = searchParams.get("productId");
  const productId = productIdParam ? Number(productIdParam) : undefined;

  // `status: "all"` — un movimiento histórico puede referenciar un producto que hoy está
  // desactivado; igual queremos poder mostrar su nombre.
  const { data: allProducts } = useProducts({ status: "all", stockStatus: "all" });
  const productsById = useMemo(
    () => new Map((allProducts ?? []).map((product) => [product.id, product])),
    [allProducts],
  );
  const filteredProduct = productId ? (productsById.get(productId) ?? null) : null;

  const {
    data: movements,
    isLoading,
    isError,
    refetch,
  } = useStockMovements({
    productId,
    type: filters.type || undefined,
    direction: filters.direction || undefined,
  });

  function clearProductFilter() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("productId");
      return next;
    });
  }

  const hasActiveFilters = Boolean(filters.type || filters.direction || productId);

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

      <MovementsFilterBar
        filters={filters}
        onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
        filteredProduct={filteredProduct}
        onClearProduct={clearProductFilter}
      />

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando movimientos…</span>
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">No se pudo cargar el historial.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {!isLoading && !isError && movements && movements.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <History className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? "No hay movimientos con esos filtros."
              : "Todavía no hay movimientos de stock registrados."}
          </p>
        </div>
      )}

      {!isLoading && !isError && movements && movements.length > 0 && (
        <MovementsTable movements={movements} productsById={productsById} />
      )}
    </div>
  );
}
