import { Loader2, ShoppingCart, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import type { PurchaseCartItem } from "../hooks/usePurchaseCart";

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

interface PurchaseCartPanelProps {
  items: PurchaseCartItem[];
  total: number;
  onSetQuantity: (productId: number, quantity: number) => void;
  onSetUnitCost: (productId: number, unitCost: number) => void;
  onRemove: (productId: number) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  successMessage: string | null;
}

export function PurchaseCartPanel({
  items,
  total,
  onSetQuantity,
  onSetUnitCost,
  onRemove,
  onConfirm,
  isSubmitting,
  errorMessage,
  successMessage,
}: PurchaseCartPanelProps) {
  return (
    <div className="flex flex-col rounded-lg border border-border">
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-medium">Compra actual</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <ShoppingCart className="h-8 w-8" />
            <p className="text-sm">Buscá o escaneá un producto para empezar.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.productId} className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => onRemove(item.productId)}
                    aria-label={`Quitar ${item.name} de la compra`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <QuantityStepper
                    value={item.quantity}
                    onIncrement={() => onSetQuantity(item.productId, item.quantity + 1)}
                    onDecrement={() => onSetQuantity(item.productId, item.quantity - 1)}
                    onChange={(quantity) => onSetQuantity(item.productId, quantity)}
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Costo</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={item.unitCost}
                      aria-label={`Costo unitario de ${item.name}`}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value) && value >= 0) {
                          onSetUnitCost(item.productId, value);
                        }
                      }}
                      className="h-7 w-20 rounded-md border border-border bg-background px-2 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>
                <p className="text-right text-sm tabular-nums text-muted-foreground">
                  Subtotal: {currencyFormatter.format(item.unitCost * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-border p-4">
        {errorMessage && <Alert variant="destructive">{errorMessage}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}

        <div className="flex items-center justify-between text-lg font-bold tabular-nums">
          <span>Total</span>
          <span>{currencyFormatter.format(total)}</span>
        </div>

        <Button
          type="button"
          className="w-full"
          size="lg"
          disabled={items.length === 0 || isSubmitting}
          onClick={onConfirm}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Registrando compra…
            </>
          ) : (
            "Confirmar compra"
          )}
        </Button>
      </div>
    </div>
  );
}
