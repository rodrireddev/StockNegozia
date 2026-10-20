import { Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabNav } from "@/components/ui/tab-nav";
import { useCategories } from "@/features/products/hooks/useCategories";
import { useProducts } from "@/features/products/hooks/useProducts";
import { CategoriesTable } from "../components/CategoriesTable";
import { countProductsByCategory } from "@stocknegozia/shared";

export function InventoryCategoriesPage() {
  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useCategories();
  // `status: "all"` — un producto inactivo sigue "perteneciendo" a su categoría a efectos de este
  // conteo, no solo el catálogo vendible.
  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useProducts({ status: "all", stockStatus: "all" });

  const isLoading = categoriesLoading || productsLoading;
  const isError = categoriesError || productsError;

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

      <p className="text-sm text-muted-foreground">
        Las categorías se crean automáticamente al asignarlas a un producto — no hay una acción para
        crear o borrar categorías por separado todavía.
      </p>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando categorías…</span>
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">No se pudo cargar las categorías.</p>
          <Button
            variant="outline"
            onClick={() => {
              void refetchCategories();
              void refetchProducts();
            }}
          >
            Reintentar
          </Button>
        </div>
      )}

      {!isLoading && !isError && categories && categories.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Tag className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No tenés categorías todavía.</p>
        </div>
      )}

      {!isLoading && !isError && categories && categories.length > 0 && products && (
        <CategoriesTable categories={countProductsByCategory(categories, products)} />
      )}
    </div>
  );
}
