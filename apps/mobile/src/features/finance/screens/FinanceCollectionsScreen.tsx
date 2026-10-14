import { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Stack, useRouter, type Href } from "expo-router";
import { CARD_BRAND_LABELS, PAYMENT_METHOD_SHORT_LABELS } from "@stocknegozia/shared";
import type { SettlementDto } from "@stocknegozia/api-contracts";
import { Card } from "@/components/Card";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import {
  LinkButton,
  ListRow,
  SectionCard,
  ShowMoreButton,
  ValueRow,
} from "../components/FinanceUi";
import { PaymentMethodsCard } from "../components/PaymentMethodsCard";
import { useFinancePeriod, useFinanceSummary, usePendingSettlements } from "../hooks/useFinance";

const PAGE_SIZE = 10;
const dayFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function describeSettlement(item: SettlementDto): string {
  let label = PAYMENT_METHOD_SHORT_LABELS[item.method];
  if (item.cardBrand) label = `${label} ${CARD_BRAND_LABELS[item.cardBrand]}`;
  if (item.installments && item.installments > 1) label = `${label} · ${item.installments} cuotas`;
  return `${label} · venta #${item.saleId}`;
}

/** "Cómo entró la plata": por medio de pago, recargos, comisiones y lo que falta acreditar. */
export function FinanceCollectionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { period } = useFinancePeriod();
  const summary = useFinanceSummary(period);
  const pending = usePendingSettlements();
  const [visible, setVisible] = useState(PAGE_SIZE);

  return (
    <>
      <Stack.Screen options={{ title: `Cobros · ${period.label}` }} />
      {summary.isPending ? (
        <LoadingState />
      ) : summary.isError ? (
        <ErrorState message="No se pudieron cargar los cobros." onRetry={summary.refetch} />
      ) : (
        <ScrollView
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={styles.content}
        >
          <Card style={styles.card}>
            <ValueRow
              label="Cobrado"
              hint="Ventas + recargos"
              value={summary.data.collections.total}
              strong
            />
            {summary.data.collections.surcharges > 0 ? (
              <ValueRow
                label="Recargos cobrados"
                value={summary.data.collections.surcharges}
                tone="positive"
              />
            ) : null}
            {summary.data.collections.fees > 0 ? (
              <ValueRow
                label="Comisiones (estimadas)"
                value={-summary.data.collections.fees}
                tone="negative"
              />
            ) : null}
            <ValueRow
              label="Por acreditar (hoy)"
              value={summary.data.pendingSettlement.amount}
              tone="warning"
              hint={`${summary.data.pendingSettlement.count} cobros pendientes`}
            />
          </Card>

          <PaymentMethodsCard data={summary.data.collections.byMethod} />

          <SectionCard title="Próximas acreditaciones">
            {pending.isPending ? (
              <LoadingState />
            ) : (pending.data ?? []).length === 0 ? (
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                No hay cobros pendientes de acreditar.
              </Text>
            ) : (
              <>
                {(pending.data ?? []).slice(0, visible).map((item) => (
                  <ListRow
                    key={item.paymentId}
                    title={dayFormatter.format(new Date(item.settlementDate))}
                    subtitle={describeSettlement(item)}
                    amount={item.netAmount}
                  />
                ))}
                <ShowMoreButton
                  remaining={(pending.data?.length ?? 0) - visible}
                  onPress={() => setVisible((current) => current + PAGE_SIZE)}
                />
              </>
            )}
          </SectionCard>

          <LinkButton
            label="Configurar recargos, comisiones y plazos"
            onPress={() => router.push("/settings/payment-terms" as Href)}
          />
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { gap: spacing.sm },
});
