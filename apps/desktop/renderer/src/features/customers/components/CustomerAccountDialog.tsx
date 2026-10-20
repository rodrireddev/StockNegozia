import { CUSTOMER_PAYMENT_METHODS, type CustomerDto } from "@stocknegozia/api-contracts";
import {
  formatMoney,
  moneyToInputText,
  parseMoneyInput,
  PAYMENT_METHOD_SHORT_LABELS,
} from "@stocknegozia/shared";
import { customerPaymentSchema } from "@stocknegozia/validation";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { getUserFriendlyError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { useCustomerAccount, useRegisterCustomerPayment } from "../hooks/useCustomers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

interface CustomerAccountDialogProps {
  customer: CustomerDto | null;
  onOpenChange: (open: boolean) => void;
}

/** Cuenta corriente de un cliente: saldo, ventas a cuenta y pagos, y "Registrar pago". */
export function CustomerAccountDialog({ customer, onOpenChange }: CustomerAccountDialogProps) {
  const account = useCustomerAccount(customer?.id ?? null);
  const registerPayment = useRegisterCustomerPayment(customer?.id ?? 0);
  const [amountText, setAmountText] = useState("");
  const [method, setMethod] = useState<(typeof CUSTOMER_PAYMENT_METHODS)[number]>("cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const balance = account.data?.balance ?? customer?.balance ?? 0;

  useEffect(() => {
    if (!customer) return;
    setAmountText(customer.balance > 0 ? moneyToInputText(customer.balance) : "");
    setMethod("cash");
    setNote("");
    setError(null);
  }, [customer]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const result = customerPaymentSchema.safeParse({
      amount: parseMoneyInput(amountText) ?? undefined,
      method,
      note,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revisá el pago");
      return;
    }
    registerPayment.mutate(result.data, {
      onSuccess: (updated) =>
        setAmountText(updated.balance > 0 ? moneyToInputText(updated.balance) : ""),
      onError: (err) => setError(getUserFriendlyError(err)),
    });
  }

  return (
    <Dialog open={customer !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cuenta corriente · {customer?.name}</DialogTitle>
          <DialogDescription>
            {balance > 0
              ? `Debe ${formatMoney(balance)}`
              : balance < 0
                ? `Saldo a favor ${formatMoney(-balance)}`
                : "No tiene deuda"}
          </DialogDescription>
        </DialogHeader>

        {balance > 0 && (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-md border border-border p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="payment-amount">Monto</Label>
                <MoneyInput id="payment-amount" value={amountText} onValueChange={setAmountText} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-method">Medio</Label>
                <Select
                  id="payment-method"
                  value={method}
                  onChange={(event) => setMethod(event.target.value as typeof method)}
                >
                  {CUSTOMER_PAYMENT_METHODS.map((value) => (
                    <option key={value} value={value}>
                      {PAYMENT_METHOD_SHORT_LABELS[value]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <Input
              aria-label="Nota"
              placeholder="Nota (opcional)"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={registerPayment.isPending} className="w-full">
              {registerPayment.isPending ? "Registrando…" : "Registrar pago"}
            </Button>
          </form>
        )}

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {account.isLoading && (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {account.data?.entries.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todavía no compró a cuenta.
            </p>
          )}
          {account.data?.entries.map((entry) => (
            <div
              key={`${entry.type}-${entry.id}`}
              className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-sm"
            >
              <div>
                <p>
                  {entry.type === "sale"
                    ? `Venta N° ${entry.saleId}`
                    : `Pago · ${entry.method ? PAYMENT_METHOD_SHORT_LABELS[entry.method] : ""}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dateFormatter.format(new Date(entry.createdAt))}
                  {entry.note ? ` · ${entry.note}` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "tabular-nums",
                  entry.type === "payment" ? "text-success" : "text-foreground",
                )}
              >
                {entry.type === "payment" ? "−" : "+"}
                {formatMoney(entry.amount)}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
