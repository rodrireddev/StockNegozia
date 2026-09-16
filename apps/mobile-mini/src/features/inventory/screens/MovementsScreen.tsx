import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { History, X } from "lucide-react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MOVEMENT_TYPE_LABELS } from "@stocknegozia/shared";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Select } from "@/components/Select";
import { useProducts } from "@/features/products/hooks/useProducts";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { MovementCard } from "../components/MovementCard";
import { InventoryTabs } from "../components/InventoryTabs";
import { useStockMovements } from "../hooks/useStockMovements";

export function MovementsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { productId: productIdParam } = useLocalSearchParams<{ productId?: string }>();
  const productId = productIdParam ? Number(productIdParam) : undefined;

  const [type, setType] = useState("");
  const [direction, setDirection] = useState("");

  // `status: "all"` — un movimiento histórico puede referenciar un producto hoy desactivado;
  // igual queremos poder mostrar su nombre, mismo criterio que Desktop.
  const productsQuery = useProducts({ status: "all", stockStatus: "all" });
  const productsById = useMemo(
    () => new Map((productsQuery.data ?? []).map((product) => [product.id, product])),
    [productsQuery.data],
  );
  const filteredProduct = productId ? (productsById.get(productId) ?? null) : null;

  const query = useStockMovements({
    productId,
    type: type || undefined,
    direction: direction || undefined,
  });

  const hasActiveFilters = Boolean(type || direction || productId);

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
        Movimientos de stock
      </Text>
      <InventoryTabs active="movements" />

      {filteredProduct && (
        <Pressable
          style={[styles.productChip, { backgroundColor: colors.secondary }]}
          onPress={() => router.replace("/inventory/movements")}
        >
          <Text style={[typography.label, { color: colors.secondaryForeground }]}>
            Producto: {filteredProduct.name}
          </Text>
          <X color={colors.secondaryForeground} size={14} />
        </Pressable>
      )}

      <View style={styles.filters}>
        <Select
          label="Tipo"
          value={type}
          placeholder="Todos los tipos"
          options={[
            { value: "", label: "Todos los tipos" },
            ...Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
          ]}
          onChange={setType}
        />
        <Select
          label="Dirección"
          value={direction}
          options={[
            { value: "", label: "Entradas y salidas" },
            { value: "IN", label: "Solo entradas" },
            { value: "OUT", label: "Solo salidas" },
          ]}
          onChange={setDirection}
        />
      </View>

      {query.isPending ? (
        <LoadingState message="Cargando movimientos…" />
      ) : query.isError ? (
        <ErrorState message="No se pudo cargar el historial." onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? "Sin movimientos" : "Todavía no hay movimientos"}
          message={
            hasActiveFilters
              ? "No hay movimientos con esos filtros."
              : "Los movimientos de stock van a aparecer acá."
          }
          icon={History}
        />
      ) : (
        <FlatList
          data={query.data}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <MovementCard movement={item} product={productsById.get(item.productId)} />
          )}
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  productChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  filters: { gap: spacing.md, marginBottom: spacing.md },
  listContent: { gap: spacing.sm, paddingBottom: spacing.xxl },
});
