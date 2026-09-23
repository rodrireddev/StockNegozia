import { Loader2, TrendingUp, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TabNav } from "@/components/ui/tab-nav";
import { useProducts } from "@/features/products/hooks/useProducts";
import { ProfitsSummary } from "../components/ProfitsSummary";
import { ProfitsTable } from "../components/ProfitsTable";
import { sumLedgerEntries } from "../data/ledger";
import { useProfitLedger } from "../hooks/useProfitLedger";

/**
 * Historial combinado de ganancias — ventas + ajustes de caja (ver `features/profits/data/
 * ledger.ts`). La ganancia de cada venta sale de `sale_items.unitPrice - sale_items.unitCost`
 * (ambos congelados al momento de la venta) — nunca de los precios ACTUALES del producto, ver
 * `ProfitsRepository` en el backend. Un ajuste de caja no toca ningún producto: sólo resta/suma
 * sobre la "Ganancia" final, nunca sobre "Vendido"/"Costo". La administración de ajustes de caja
 * (alta + su propio historial) vive en su propia pantalla del menú principal
 * (`features/cash-adjustments`), no acá.
 */
export function ProfitsHistoryPage() {
  const [productId, setProductId] = useState("");

  // `status: "all"` — una venta histórica puede referenciar un producto hoy desactivado; igual
  // queremos poder filtrar/mostrar su nombre, mismo criterio que Movimientos.
  const { data: allProducts } = useProducts({ status: "all", stockStatus: "all" });

  const {
    data: entries,
    isLoading,
    isError,
    refetch,
  } = useProfitLedger({ productId: productId ? Number(productId) : undefined });

  const totals = useMemo(() => sumLedgerEntries(entries ?? []), [entries]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Ganancias</h1>
      <TabNav
        items={[
          { to: "/profits", label: "Historial", end: true },
          { to: "/profits/chart", label: "Gráfico" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          className="w-auto"
        >
          <option value="">Todos los productos</option>
          {(allProducts ?? []).map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </Select>
        {productId && (
          <Button variant="outline" size="sm" onClick={() => setProductId("")}>
            <X className="mr-1 h-3 w-3" />
            Limpiar filtro
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando ganancias…</span>
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

      {!isLoading && !isError && entries && entries.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <TrendingUp className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {productId
              ? "Este producto no tiene ventas registradas."
              : "Todavía no hay ganancias registradas. Las ventas y ajustes de caja van a aparecer acá."}
          </p>
        </div>
      )}

      {!isLoading && !isError && entries && entries.length > 0 && (
        <>
          <ProfitsSummary {...totals} />
          <ProfitsTable entries={entries} />
        </>
      )}
    </div>
  );
}
