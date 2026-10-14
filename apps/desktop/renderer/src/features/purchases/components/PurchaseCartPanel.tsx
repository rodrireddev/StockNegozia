import { Loader2, ShoppingCart, X } from "lucide-react";
import {
  formatMoney,
  formatMoneyInputText,
  moneyToInputText,
  parseMoneyInput,
} from "@stocknegozia/shared";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import type { PurchaseCartItem } from "../hooks/usePurchaseCart";

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

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <QuantityStepper
                    value={item.quantity}
                    onIncrement={() => onSetQuantity(item.productId, item.quantity + 1)}
                    onDecrement={() => onSetQuantity(item.productId, item.quantity - 1)}
                    onChange={(quantity) => onSetQuantity(item.productId, quantity)}
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Costo</span>
                    <UnitCostInput
                      value={item.unitCost}
                      label={`Costo unitario de ${item.name}`}
                      onChange={(value) => onSetUnitCost(item.productId, value)}
                    />
                  </div>
                </div>
                <p className="text-right text-sm tabular-nums text-muted-foreground">
                  Subtotal: {formatMoney(item.unitCost * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-border p-4">
        {errorMessage && <Alert variant="destructive">{errorMessage}</Alert>}
        {successMessage && <Alert variant="success">{successMessage}</Alert>}

        <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-lg font-bold tabular-nums">
          <span>Total</span>
          <span className="min-w-0 break-all text-right">{formatMoney(total)}</span>
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

/**
 * Costo unitario editable con miles agrupados ("100.000.000"). Mantiene su propio texto mientras
 * se escribe (si no, "1.500," se reformatearía a "1.500" al instante y no se podría escribir la
 * coma) y sólo propaga números válidos.
 */
function UnitCostInput({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(() => moneyToInputText(value));

  useEffect(() => {
    // Sincroniza si el costo cambió desde afuera (p. ej. se volvió a agregar el producto).
    if (parseMoneyInput(text) !== value) setText(moneyToInputText(value));
  }, [value]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-muted-foreground">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        aria-label={label}
        onChange={(event) => {
          const next = formatMoneyInputText(event.target.value, text);
          setText(next);
          const parsed = parseMoneyInput(next);
          if (parsed !== null && parsed >= 0) onChange(parsed);
        }}
        onBlur={() => setText(moneyToInputText(value))}
        className="h-7 w-36 rounded-md border border-border bg-background pl-5 pr-2 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}
