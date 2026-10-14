import {
  formatMoney,
  newCreditPlanRow,
  paymentTermsFormToInput,
  paymentTermsToForm,
  type PaymentTermsForm,
  type PlanTermsFormRow,
} from "@stocknegozia/shared";
import { MAX_CREDIT_PLANS } from "@stocknegozia/api-contracts";
import { paymentTermsSchema } from "@stocknegozia/validation";
import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getUserFriendlyError } from "@/lib/errors";
import { usePaymentTerms, useUpdatePaymentTerms } from "../hooks/usePaymentTerms";

type RowField = "installments" | "surchargePercent" | "feePercent" | "settlementDays";

/**
 * Recargos al cliente, comisiones del procesador y días de acreditación por medio de pago y plan
 * de cuotas — editables porque cambian seguido. Las ventas ya registradas no cambian: cada pago
 * guarda las condiciones vigentes al momento de venderse.
 */
export function PaymentTermsCard() {
  const terms = usePaymentTerms();
  const update = useUpdatePaymentTerms();
  const [form, setForm] = useState<PaymentTermsForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (terms.data && !form) setForm(paymentTermsToForm(terms.data));
  }, [terms.data, form]);

  if (terms.isLoading || !form) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando condiciones de cobro…
        </CardContent>
      </Card>
    );
  }

  const change = (next: PaymentTermsForm) => {
    setForm(next);
    setSaved(false);
  };
  const updateRow = (row: PlanTermsFormRow, field: RowField, value: string): PlanTermsFormRow => ({
    ...row,
    [field]: value,
  });

  function handleSave() {
    if (!form) return;
    setError(null);
    const parsed = paymentTermsSchema.safeParse(paymentTermsFormToInput(form));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisá los valores");
      return;
    }
    update.mutate(parsed.data, {
      onSuccess: (savedTerms) => {
        setForm(paymentTermsToForm(savedTerms));
        setSaved(true);
      },
      onError: (err) => setError(getUserFriendlyError(err)),
    });
  }

  const renderInputs = (
    row: PlanTermsFormRow,
    onChange: (row: PlanTermsFormRow) => void,
    label: string,
  ) => (
    <>
      {(["surchargePercent", "feePercent", "settlementDays"] as const).map((field) => (
        <td key={field} className="px-1 py-1">
          <Input
            aria-label={`${label}: ${field === "surchargePercent" ? "recargo" : field === "feePercent" ? "comisión" : "días de acreditación"}`}
            inputMode="decimal"
            className="h-8 text-right tabular-nums"
            value={row[field]}
            onChange={(event) => onChange(updateRow(row, field, event.target.value))}
          />
        </td>
      ))}
    </>
  );

  const example = form.credit.find((row) => Number(row.surchargePercent.replace(",", ".")) > 0);
  const examplePercent = example ? Number(example.surchargePercent.replace(",", ".")) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medios de pago: recargos, comisiones y plazos</CardTitle>
        <CardDescription>
          El <strong>recargo</strong> se le suma al cliente al cobrar. La <strong>comisión</strong>{" "}
          es lo que te descuenta el procesador (no la ve el cliente). Los <strong>días</strong> son
          lo que tarda la plata en llegar a tu cuenta. Las ventas ya hechas no cambian.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-1 py-1 font-medium">Medio / plan</th>
                <th className="px-1 py-1 text-right font-medium">Recargo %</th>
                <th className="px-1 py-1 text-right font-medium">Comisión %</th>
                <th className="px-1 py-1 text-right font-medium">Días acreditación</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-1 py-1">Débito</td>
                {renderInputs(form.debit, (debit) => change({ ...form, debit }), "Débito")}
                <td />
              </tr>
              {form.credit.map((row) => (
                <tr key={row.key}>
                  <td className="px-1 py-1">
                    <div className="flex items-center gap-1">
                      Crédito
                      {row.installments === "1" ? (
                        <span>1 pago</span>
                      ) : (
                        <>
                          <Input
                            aria-label="Cantidad de cuotas"
                            inputMode="numeric"
                            className="h-8 w-14 text-right tabular-nums"
                            value={row.installments}
                            onChange={(event) =>
                              change({
                                ...form,
                                credit: form.credit.map((other) =>
                                  other.key === row.key
                                    ? updateRow(other, "installments", event.target.value)
                                    : other,
                                ),
                              })
                            }
                          />
                          cuotas
                        </>
                      )}
                    </div>
                  </td>
                  {renderInputs(
                    row,
                    (next) =>
                      change({
                        ...form,
                        credit: form.credit.map((other) => (other.key === row.key ? next : other)),
                      }),
                    `Crédito ${row.installments} cuotas`,
                  )}
                  <td className="px-1">
                    {row.installments !== "1" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Quitar plan de ${row.installments} cuotas`}
                        onClick={() =>
                          change({
                            ...form,
                            credit: form.credit.filter((other) => other.key !== row.key),
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-1 py-1">QR / Billetera</td>
                {renderInputs(form.qr, (qr) => change({ ...form, qr }), "QR")}
                <td />
              </tr>
              <tr>
                <td className="px-1 py-1">Transferencia</td>
                {renderInputs(
                  form.transfer,
                  (transfer) => change({ ...form, transfer }),
                  "Transferencia",
                )}
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={form.credit.length >= MAX_CREDIT_PLANS}
            onClick={() =>
              change({ ...form, credit: [...form.credit, newCreditPlanRow(form.credit)] })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Agregar plan de cuotas
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.businessDays}
              onChange={(event) => change({ ...form, businessDays: event.target.checked })}
            />
            Contar sólo días hábiles (lunes a viernes)
          </label>
        </div>

        {example && (
          <p className="text-xs text-muted-foreground">
            Ejemplo: una venta de {formatMoney(10_000)} en {example.installments} cuotas se cobra{" "}
            {formatMoney(10_000 * (1 + examplePercent / 100))}.
          </p>
        )}

        {error && <Alert variant="destructive">{error}</Alert>}
        {saved && (
          <Alert variant="success">Condiciones guardadas. Se aplican a las próximas ventas.</Alert>
        )}

        <Button type="button" onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? "Guardando…" : "Guardar condiciones"}
        </Button>
      </CardContent>
    </Card>
  );
}
