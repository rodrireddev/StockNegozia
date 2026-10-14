import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CashAdjustmentForm } from "../components/CashAdjustmentForm";
import { CashAdjustmentsTable } from "../components/CashAdjustmentsTable";
import { useCashAdjustments } from "../hooks/useCashAdjustments";

/**
 * Retiros/ingresos de caja — pantalla propia en el menú principal, NUNCA dentro de Ganancias: acá
 * es donde se administran (alta + su propio historial), mientras que Ganancias sólo muestra su
 * total y su desglose por motivo en una vista propia ("Ganancias → Caja"), separado de lo que se
 * ganó vendiendo.
 */
export function CashAdjustmentsPage() {
  const { data: adjustments, isLoading, isError, refetch } = useCashAdjustments();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Ajustes de caja</h1>

      <CashAdjustmentForm />

      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando ajustes de caja…</span>
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

      {!isLoading && !isError && adjustments && adjustments.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Wallet className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Todavía no hay ajustes de caja registrados.
          </p>
        </div>
      )}

      {!isLoading && !isError && adjustments && adjustments.length > 0 && (
        <CashAdjustmentsTable adjustments={adjustments} />
      )}
    </div>
  );
}
