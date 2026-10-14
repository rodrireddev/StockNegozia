import { StyleSheet, Text, View } from "react-native";
import {
  Banknote,
  CircleQuestionMark,
  CreditCard,
  Landmark,
  QrCode,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import type { PaymentMethod, PaymentMethodTotalDto } from "@stocknegozia/api-contracts";
import {
  formatMoney,
  PAYMENT_METHOD_LABELS,
  UNSPECIFIED_PAYMENT_LABEL,
} from "@stocknegozia/shared";
import { Card } from "@/components/Card";
import { useTheme } from "@/theme/useTheme";
import { radius, spacing, typography } from "@/theme/tokens";

const METHOD_ICONS: Record<PaymentMethod, LucideIcon> = {
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
 * "¿Cómo entró la plata?" — total cobrado por medio de pago con una barra proporcional. Sirve para
 * cuadrar la caja: "Efectivo" es lo que debería haber en el cajón (± ajustes de caja). Mismo
 * componente en `apps/mobile` y equivalente a `PaymentMethodsCard` de Desktop.
 */
export function PaymentMethodsCard({
  data,
  isLoading,
  title = "Cobrado por medio de pago",
}: PaymentMethodsCardProps) {
  const { colors } = useTheme();
  const total = (data ?? []).reduce((sum, row) => sum + row.amount, 0);

  return (
    <Card style={styles.card}>
      <Text style={[typography.label, { color: colors.mutedForeground }]}>{title}</Text>
      {isLoading ? (
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>Cargando…</Text>
      ) : !data || data.length === 0 ? (
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          Sin ventas en este período.
        </Text>
      ) : (
        data.map((row) => {
          const Icon = row.method ? METHOD_ICONS[row.method] : CircleQuestionMark;
          const share = total > 0 ? row.amount / total : 0;
          return (
            <View key={row.method ?? "none"} style={styles.row}>
              <View style={styles.rowHeader}>
                <Icon size={16} color={colors.mutedForeground} />
                <View style={styles.labelBlock}>
                  <Text style={[typography.body, { color: colors.foreground }]} numberOfLines={1}>
                    {row.method ? PAYMENT_METHOD_LABELS[row.method] : UNSPECIFIED_PAYMENT_LABEL}
                  </Text>
                  <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                    {row.salesCount} {row.salesCount === 1 ? "venta" : "ventas"}
                  </Text>
                </View>
                <Text
                  style={[typography.bodyStrong, styles.amount, { color: colors.foreground }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatMoney(row.amount)}
                </Text>
              </View>
              {row.surchargeAmount > 0 || row.feeAmount > 0 ? (
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  {row.surchargeAmount > 0 ? `Recargos ${formatMoney(row.surchargeAmount)} · ` : ""}
                  {row.feeAmount > 0 ? `Comisión −${formatMoney(row.feeAmount)} · ` : ""}
                  Neto {formatMoney(row.netAmount)}
                </Text>
              ) : null}
              <View style={[styles.track, { backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.fill,
                    {
                      backgroundColor: colors.primary,
                      width: `${Math.max(share * 100, share > 0 ? 2 : 0)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { gap: spacing.xs },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  labelBlock: { flex: 1, minWidth: 0 },
  amount: { flexShrink: 1, maxWidth: "50%", textAlign: "right" },
  track: { height: 6, borderRadius: radius.full, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.full },
});
