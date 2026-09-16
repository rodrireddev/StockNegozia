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
import { useUpdateSellerName } from "@/features/devices/hooks/useUpdateSellerName";

interface MissingSellerNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Bloquea el registro de ventas hasta que este equipo tenga un "vendedor actual" configurado (ver
 * docs/inventory/STOCK_MOVEMENTS.md §Trazabilidad) — `SalesPage.handleConfirm()` abre este modal
 * en vez de llamar a la API cuando falta. Guarda el nombre acá mismo (mismo endpoint que la card
 * de Configuración) para que la persona no tenga que salir de la pantalla de venta a corregirlo;
 * solo cierra el modal al guardar, no reintenta la venta automáticamente.
 */
export function MissingSellerNameModal({ open, onOpenChange }: MissingSellerNameModalProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const updateSellerName = useUpdateSellerName();

  function handleSave() {
    setError(null);
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Ingresá el nombre del vendedor actual");
      return;
    }
    updateSellerName.mutate(
      { sellerName: trimmed },
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
          <DialogTitle>Falta indicar el vendedor actual</DialogTitle>
          <DialogDescription>
            No se puede registrar una venta sin indicar quién está operando este equipo. Colocá el
            nombre del vendedor actual para continuar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="missing-seller-name">Coloque el nombre del vendedor actual</Label>
          <Input
            id="missing-seller-name"
            placeholder="Ej: Rodrigo"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateSellerName.isPending}>
            {updateSellerName.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
