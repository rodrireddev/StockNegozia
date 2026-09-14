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
import { useUpdateStock } from "../hooks/useUpdateStock";

interface StockAdjustDialogProps {
  product: ProductDto | null;
  onOpenChange: (open: boolean) => void;
}

export function StockAdjustDialog({ product, onOpenChange }: StockAdjustDialogProps) {
  const [value, setValue] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const updateStock = useUpdateStock();

  useEffect(() => {
    if (product) {
      setValue(String(product.stock));
      setError(null);
    }
  }, [product]);

  const handleConfirm = () => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("Ingresá un número entero mayor o igual a 0");
      return;
    }
    if (!product) return;
    updateStock.mutate(
      { id: product.id, stock: parsed },
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
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={updateStock.isPending}>
            {updateStock.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
