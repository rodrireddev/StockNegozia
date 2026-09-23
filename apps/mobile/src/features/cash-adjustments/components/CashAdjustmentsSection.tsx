import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Wallet } from "lucide-react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAuthErrorRedirect } from "@/auth/useAuthErrorRedirect";
import { spacing } from "@/theme/tokens";
import { useCashAdjustments } from "../hooks/useCashAdjustments";
import { CashAdjustmentCard } from "./CashAdjustmentCard";
import { CashAdjustmentFormModal } from "./CashAdjustmentFormModal";

/** Historial dedicado de ajustes de caja (retiros/ingresos) + alta — estas mismas filas también
 *  aparecen mezcladas en "Historial" de Ganancias (ver `ProfitsScreen`), acá se pueden ver solas
 *  y cargar una nueva. */
export function CashAdjustmentsSection() {
  const [formOpen, setFormOpen] = useState(false);
  const query = useCashAdjustments();
  useAuthErrorRedirect(query.error);

  return (
    <View style={styles.container}>
      <Button label="+ Nuevo ajuste" onPress={() => setFormOpen(true)} testID="new-cash-adjustment" />

      {query.isPending ? (
        <LoadingState message="Cargando ajustes de caja…" />
      ) : query.isError ? (
        <ErrorState message="No se pudo cargar el historial." onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="Todavía no hay ajustes de caja"
          message="Los retiros e ingresos que registres van a aparecer acá."
          icon={Wallet}
        />
      ) : (
        <FlatList
          data={query.data}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <CashAdjustmentCard adjustment={item} />}
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
        />
      )}

      <CashAdjustmentFormModal visible={formOpen} onClose={() => setFormOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.md },
  listContent: { gap: spacing.sm, paddingBottom: spacing.xxl },
});
