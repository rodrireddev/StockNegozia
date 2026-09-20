import { Loader2, ShoppingCart, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import type { CartItem } from "../hooks/useCart";

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

interface SaleCartPanelProps {
  items: CartItem[];
  total: number;
  onIncrement: (productId: number) => void;
  onDecrement: (productId: number) => void;
  onRemove: (productId: number) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  generateReceipt: boolean;
  onGenerateReceiptChange: (value: boolean) => void;
  receiptNotice: string | null;
}

export function SaleCartPanel({
  items,
  total,
  onIncrement,
  onDecrement,
  onRemove,
  onConfirm,
  isSubmitting,
  errorMessage,
  successMessage,
  generateReceipt,
  onGenerateReceiptChange,
  receiptNotice,
}: SaleCartPanelProps) {
  return (
    <div className="flex flex-col rounded-lg border border-border">
      <div className="border-b border-border p-4">
        <h2 className="text-sm font-medium">Venta actual</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <ShoppingCart className="h-8 w-8" />
            <p className="text-sm">Buscá o escaneá un producto para empezar.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => {
              const insufficientStock = item.quantity > item.availableStock;
              return (
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
                      aria-label={`Quitar ${item.name} de la venta`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <QuantityStepper
                      value={item.quantity}
                      onIncrement={() => onIncrement(item.productId)}
                      onDecrement={() => onDecrement(item.productId)}
                    />
                    <span className="text-sm tabular-nums">
                      {currencyFormatter.format(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                  {insufficientStock && (
                    <p className="text-xs text-warning">
                      Stock disponible: {item.availableStock}. Puede haber cambiado — se confirma al
                      registrar la venta.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-border p-4">
        {errorMessage && <Alert variant="destructive">{errorMessage}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}
        {receiptNotice && <Alert variant="warning">{receiptNotice}</Alert>}

        <div className="flex items-center justify-between text-lg font-bold tabular-nums">
          <span>Total</span>
          <span>{currencyFormatter.format(total)}</span>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            checked={generateReceipt}
            onChange={(event) => onGenerateReceiptChange(event.target.checked)}
          />
          Generar recibo PDF al confirmar
        </label>

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
              Registrando venta…
            </>
          ) : (
            "Confirmar venta"
          )}
        </Button>
      </div>
    </div>
  );
}
