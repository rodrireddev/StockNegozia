import { useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Wallet } from "lucide-react-native";
import { groupCashByReason, roundMoney } from "@stocknegozia/shared";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useTheme } from "@/theme/useTheme";
import { spacing } from "@/theme/tokens";
import {
  BarList,
  LinkButton,
  ListRow,
  SectionCard,
  ShowMoreButton,
  ValueRow,
} from "../components/FinanceUi";
import { useCashAdjustmentsInRange, useFinancePeriod } from "../hooks/useFinance";

const PAGE_SIZE = 15;
const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "Lo que se retiró de la caja y por qué": retiros e ingresos fuera de las ventas, por motivo.
 *  Separado de la ganancia por ventas a propósito. El alta sigue en "Ajustes de caja". */
export function FinanceCashScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { period } = useFinancePeriod();
  const adjustments = useCashAdjustmentsInRange(period);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { withdrawals, deposits, groups } = useMemo(() => {
    const rows = (adjustments.data ?? []).map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
    }));
    return {
      withdrawals: roundMoney(
        rows.filter((row) => row.direction === "OUT").reduce((sum, row) => sum + row.amount, 0),
      ),
      deposits: roundMoney(
        rows.filter((row) => row.direction === "IN").reduce((sum, row) => sum + row.amount, 0),
      ),
      groups: groupCashByReason(rows),
    };
  }, [adjustments.data]);
  const withdrawalGroups = groups.filter((group) => group.direction === "OUT");
  const depositGroups = groups.filter((group) => group.direction === "IN");

  return (
    <>
      <Stack.Screen options={{ title: `Caja · ${period.label}` }} />
      {adjustments.isPending ? (
        <LoadingState />
      ) : adjustments.isError ? (
        <ErrorState
          message="No se pudieron cargar los movimientos de caja."
          onRetry={adjustments.refetch}
        />
      ) : (
        <ScrollView
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={styles.content}
        >
          {adjustments.data.length === 0 ? (
            <EmptyState
              title="Sin movimientos"
              message="No hay retiros ni ingresos de caja en este período."
              icon={Wallet}
            />
          ) : (
            <>
              <Card style={styles.card}>
                <ValueRow label="Retiros" value={withdrawals} tone="negative" strong />
                <ValueRow label="Ingresos" value={deposits} tone="positive" />
              </Card>

              {withdrawalGroups.length > 0 ? (
                <SectionCard title="Retiros por motivo">
                  <BarList
                    barColor={colors.danger}
                    items={withdrawalGroups.map((group) => ({
                      key: group.reason,
                      label: group.reason,
                      sublabel: `${group.count} ${group.count === 1 ? "vez" : "veces"}`,
                      amount: group.total,
                    }))}
                  />
                </SectionCard>
              ) : null}

              {depositGroups.length > 0 ? (
                <SectionCard title="Ingresos por motivo">
                  <BarList
                    barColor={colors.success}
                    items={depositGroups.map((group) => ({
                      key: group.reason,
                      label: group.reason,
                      amount: group.total,
                    }))}
                  />
                </SectionCard>
              ) : null}

              <SectionCard title="Movimientos">
                {adjustments.data.slice(0, visible).map((row) => (
                  <ListRow
                    key={row.id}
                    title={row.reason}
                    subtitle={`${row.direction === "OUT" ? "Retiro" : "Ingreso"} · ${dateFormatter.format(new Date(row.createdAt))}`}
                    amount={row.amount}
                    prefix={row.direction === "OUT" ? "−" : "+"}
                    tone={row.direction === "OUT" ? "negative" : "positive"}
                  />
                ))}
                <ShowMoreButton
                  remaining={adjustments.data.length - visible}
                  onPress={() => setVisible((current) => current + PAGE_SIZE)}
                />
              </SectionCard>
            </>
          )}
          <LinkButton
            label="Registrar retiro o ingreso"
            onPress={() => router.push("/cash-adjustments")}
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
