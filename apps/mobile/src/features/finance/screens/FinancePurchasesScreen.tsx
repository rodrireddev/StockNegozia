import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Stack } from "expo-router";
import { PackagePlus } from "lucide-react-native";
import { roundMoney } from "@stocknegozia/shared";
import { Card } from "@/components/Card";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { BarList, ListRow, SectionCard, ShowMoreButton, ValueRow } from "../components/FinanceUi";
import { useFinancePeriod, usePurchasesInRange } from "../hooks/useFinance";

const PAGE_SIZE = 15;
const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "Lo que se gastó en productos": compras a proveedores del período, por proveedor y detalle. */
export function FinancePurchasesScreen() {
  const { colors } = useTheme();
  const { period } = useFinancePeriod();
  const purchases = usePurchasesInRange(period);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { total, bySupplier } = useMemo(() => {
    const groups = new Map<string, { total: number; count: number }>();
    let sum = 0;
    for (const purchase of purchases.data ?? []) {
      sum = roundMoney(sum + purchase.total);
      const group = groups.get(purchase.supplierName) ?? { total: 0, count: 0 };
      group.total = roundMoney(group.total + purchase.total);
      group.count += 1;
      groups.set(purchase.supplierName, group);
    }
    return {
      total: sum,
      bySupplier: [...groups.entries()]
        .map(([name, group]) => ({ name, ...group }))
        .sort((a, b) => b.total - a.total),
    };
  }, [purchases.data]);

  return (
    <>
      <Stack.Screen options={{ title: `Compras · ${period.label}` }} />
      {purchases.isPending ? (
        <LoadingState />
      ) : purchases.isError ? (
        <ErrorState message="No se pudieron cargar las compras." onRetry={purchases.refetch} />
      ) : purchases.data.length === 0 ? (
        <EmptyState
          title="Sin compras"
          message="No hay compras de mercadería en este período."
          icon={PackagePlus}
        />
      ) : (
        <ScrollView
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={styles.content}
        >
          <Card style={styles.card}>
            <ValueRow label="Gastado en mercadería" value={total} strong />
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              {purchases.data.length} {purchases.data.length === 1 ? "compra" : "compras"} ·{" "}
              {bySupplier.length} {bySupplier.length === 1 ? "proveedor" : "proveedores"}
            </Text>
          </Card>

          <SectionCard title="Por proveedor">
            <BarList
              barColor={colors.warning}
              items={bySupplier.map((supplier) => ({
                key: supplier.name,
                label: supplier.name,
                sublabel: `${supplier.count} ${supplier.count === 1 ? "compra" : "compras"}`,
                amount: supplier.total,
              }))}
            />
          </SectionCard>

          <SectionCard title="Detalle de compras">
            <ExportCsvButton
              fileName="compras"
              rows={purchases.data}
              columns={[
                { header: "Fecha", value: (p) => dateFormatter.format(new Date(p.createdAt)) },
                { header: "Compra N°", value: (p) => p.id },
                { header: "Proveedor", value: (p) => p.supplierName },
                { header: "Total", value: (p) => p.total },
              ]}
            />
            {purchases.data.slice(0, visible).map((purchase) => (
              <ListRow
                key={purchase.id}
                title={purchase.supplierName}
                subtitle={dateFormatter.format(new Date(purchase.createdAt))}
                amount={purchase.total}
              />
            ))}
            <ShowMoreButton
              remaining={purchases.data.length - visible}
              onPress={() => setVisible((current) => current + PAGE_SIZE)}
            />
          </SectionCard>
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { gap: spacing.sm },
});
