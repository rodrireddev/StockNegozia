import type { ProductDto } from "@stocknegozia/api-contracts";
import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useAdjustStock } from "../hooks/useAdjustStock";

interface StockAdjustDialogProps {
  product: ProductDto | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Recibe el stock ABSOLUTO deseado y un motivo obligatorio — el backend calcula el delta y genera
 * el stock_movement correspondiente (`POST /products/:id/stock-adjustments`, ver
 * docs/inventory/STOCK_MOVEMENTS.md). Esta UI nunca calcula ni envía un delta.
 */
export function StockAdjustDialog({ product, onOpenChange }: StockAdjustDialogProps) {
  const [value, setValue] = useState("0");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const adjustStock = useAdjustStock();

  useEffect(() => {
    if (product) {
      setValue(String(product.stock));
      setReason("");
      setError(null);
    }
  }, [product]);

  const handleConfirm = () => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("Ingresá un número entero mayor o igual a 0");
      return;
    }
    if (!reason.trim()) {
      setError("Ingresá un motivo para el ajuste");
      return;
    }
    if (!product) return;
    adjustStock.mutate(
      { id: product.id, stock: parsed, reason: reason.trim() },
      { onSuccess: () => onOpenChange(false), onError: (err) => setError(err.message) },
    );
  };

  return (
    <Dialog open={product !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription>
            {product ? `${product.name} (SKU ${product.sku})` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stock-value">Nuevo stock</Label>
            <Input
              id="stock-value"
              type="number"
              min={0}
              step={1}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-reason">Motivo</Label>
            <Textarea
              id="stock-reason"
              placeholder="Ej: Conteo físico, mercadería dañada, corrección de inventario…"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={adjustStock.isPending}>
            {adjustStock.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
