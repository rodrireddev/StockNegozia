import type { CashAdjustmentDirection } from "@stocknegozia/api-contracts";
import { parseMoneyInput } from "@stocknegozia/shared";
import { createCashAdjustmentSchema } from "@stocknegozia/validation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { getUserFriendlyError } from "@/lib/errors";
import { useCreateCashAdjustment } from "../hooks/useCreateCashAdjustment";

/** Alta de un movimiento de caja sin relación con ninguna venta — el caso de uso principal es
 *  "retiro" (pagar una deuda, un sueldo), por eso arranca en `OUT`, pero también admite `IN` (un
 *  aporte de capital propio) para no dejar la caja en falso cuando efectivamente entró plata por
 *  fuera de una venta. */
export function CashAdjustmentForm() {
  const [direction, setDirection] = useState<CashAdjustmentDirection>("OUT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const createCashAdjustment = useCreateCashAdjustment();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = createCashAdjustmentSchema.safeParse({
      direction,
      amount: parseMoneyInput(amount) ?? amount,
      reason,
    });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    setFieldErrors({});

    createCashAdjustment.mutate(result.data, {
      onSuccess: () => {
        setAmount("");
        setReason("");
      },
      onError: (error) => setFormError(getUserFriendlyError(error)),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="cash-adjustment-direction">Tipo</Label>
          <Select
            id="cash-adjustment-direction"
            value={direction}
            onChange={(event) => setDirection(event.target.value as CashAdjustmentDirection)}
            className="w-auto"
          >
            <option value="OUT">Retiro</option>
            <option value="IN">Ingreso</option>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="cash-adjustment-amount">Monto</Label>
          <MoneyInput id="cash-adjustment-amount" value={amount} onValueChange={setAmount} />
          {fieldErrors.amount && (
            <p className="text-sm text-destructive">{fieldErrors.amount[0]}</p>
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="cash-adjustment-reason">Motivo</Label>
          <Input
            id="cash-adjustment-reason"
            placeholder={direction === "OUT" ? "Ej: Pago sueldo Juan" : "Ej: Aporte propio"}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {fieldErrors.reason && (
            <p className="text-sm text-destructive">{fieldErrors.reason[0]}</p>
          )}
        </div>
        <Button type="submit" disabled={createCashAdjustment.isPending}>
          {createCashAdjustment.isPending ? "Guardando…" : "Registrar"}
        </Button>
      </div>
      {formError && <p className="text-sm text-destructive">{formError}</p>}
    </form>
  );
}
