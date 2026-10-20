import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUserFriendlyError } from "@/lib/errors";
import { useUpdateSettings } from "@/features/settings/hooks/useUpdateSettings";

interface MissingBusinessNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Bloquea la generación del recibo PDF hasta que el negocio tenga un nombre configurado — sin
 * esto, el backend usa "StockNegozia" como nombre genérico en el encabezado (ver
 * apps/backend/src/core/sales/sale-receipt.pdf.ts), un error que antes recién se notaba mirando el
 * PDF ya entregado. `SalesPage.handleConfirm()` abre este modal en vez de confirmar la venta
 * cuando falta y el checkbox de recibo está tildado; mismo criterio que
 * `MissingSellerNameModal` — solo cierra el modal al guardar, no reintenta la venta sola.
 */
export function MissingBusinessNameModal({ open, onOpenChange }: MissingBusinessNameModalProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const updateSettings = useUpdateSettings();

  function handleSave() {
    setError(null);
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Ingresá el nombre del negocio");
      return;
    }
    updateSettings.mutate(
      { businessName: trimmed },
      {
        onSuccess: () => {
          setValue("");
          onOpenChange(false);
        },
        onError: (err) => setError(getUserFriendlyError(err)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Falta indicar el nombre del negocio</DialogTitle>
          <DialogDescription>
            No se puede generar el recibo sin un nombre de negocio configurado — sin esto, el recibo
            sale con un nombre genérico. Colocalo para continuar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="missing-business-name">Nombre del negocio</Label>
          <Input
            id="missing-business-name"
            placeholder="Ej: Almacén Doña Rosa"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
