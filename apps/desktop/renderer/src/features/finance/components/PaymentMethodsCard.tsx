import type { PaymentMethod, PaymentMethodTotalDto } from "@stocknegozia/api-contracts";
import {
  formatMoney,
  PAYMENT_METHOD_LABELS,
  UNSPECIFIED_PAYMENT_LABEL,
} from "@stocknegozia/shared";
import { Banknote, CreditCard, HelpCircle, Landmark, Loader2, QrCode, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const METHOD_ICONS: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  debit_card: CreditCard,
  credit_card: CreditCard,
  transfer: Landmark,
  qr: QrCode,
  other: Wallet,
};

interface PaymentMethodsCardProps {
  data: PaymentMethodTotalDto[] | undefined;
  isLoading?: boolean;
  title?: string;
}

/**
 * "¿Cómo entró la plata?" — total cobrado por medio de pago, con una barra horizontal
 * proporcional al total del período. Sirve para cuadrar la caja: lo que dice "Efectivo" es lo que
 * debería haber en el cajón (más/menos los ajustes de caja).
 */
export function PaymentMethodsCard({
  data,
  isLoading,
  title = "Cobrado por medio de pago",
}: PaymentMethodsCardProps) {
  const total = (data ?? []).reduce((sum, row) => sum + row.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ventas en este período.</p>
        ) : (
          data.map((row) => {
            const Icon = row.method ? METHOD_ICONS[row.method] : HelpCircle;
            const share = total > 0 ? row.amount / total : 0;
            return (
              <div key={row.method ?? "none"} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {row.method ? PAYMENT_METHOD_LABELS[row.method] : UNSPECIFIED_PAYMENT_LABEL}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {row.salesCount} {row.salesCount === 1 ? "venta" : "ventas"}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatMoney(row.amount)}
                  </span>
                </div>
                {(row.surchargeAmount > 0 || row.feeAmount > 0) && (
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {row.surchargeAmount > 0 && `Recargos ${formatMoney(row.surchargeAmount)} · `}
                    {row.feeAmount > 0 && `Comisión −${formatMoney(row.feeAmount)} · `}
                    Neto {formatMoney(row.netAmount)}
                  </p>
                )}
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(share * 100, share > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
