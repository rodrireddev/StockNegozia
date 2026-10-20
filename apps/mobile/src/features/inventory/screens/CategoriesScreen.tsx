import { FlatList, StyleSheet, Text } from "react-native";
import { Tag } from "lucide-react-native";
import { countProductsByCategory } from "@stocknegozia/shared";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useAuthErrorRedirect } from "@/auth/useAuthErrorRedirect";
import { useCategories } from "@/features/products/hooks/useCategories";
import { useProducts } from "@/features/products/hooks/useProducts";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { InventoryTabs } from "../components/InventoryTabs";

export function CategoriesScreen() {
  const { colors } = useTheme();
  const categoriesQuery = useCategories();
  // `status: "all"` — un producto inactivo sigue "perteneciendo" a su categoría a efectos de este
  // conteo, mismo criterio que Desktop.
  const productsQuery = useProducts({ status: "all", stockStatus: "all" });
  useAuthErrorRedirect(categoriesQuery.error ?? productsQuery.error);

  const isLoading = categoriesQuery.isPending || productsQuery.isPending;
  const isError = categoriesQuery.isError || productsQuery.isError;

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.xs }]}>
        Categorías
      </Text>
      <InventoryTabs active="categories" />
      <Text
        style={[typography.caption, { color: colors.mutedForeground, marginBottom: spacing.md }]}
      >
        Las categorías se crean automáticamente al asignarlas a un producto — no hay una acción para
        crear o borrar categorías por separado todavía.
      </Text>

      {isLoading ? (
        <LoadingState message="Cargando categorías…" />
      ) : isError ? (
        <ErrorState
          message="No se pudo cargar las categorías."
          onRetry={() => {
            void categoriesQuery.refetch();
            void productsQuery.refetch();
          }}
        />
      ) : (categoriesQuery.data ?? []).length === 0 ? (
        <EmptyState title="No tenés categorías todavía" icon={Tag} />
      ) : (
        <FlatList
          data={countProductsByCategory(categoriesQuery.data ?? [], productsQuery.data ?? [])}
          keyExtractor={(item) => String(item.id ?? "uncategorized")}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <Text style={[typography.bodyStrong, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[typography.body, { color: colors.mutedForeground }]}>
                {item.productCount} producto{item.productCount === 1 ? "" : "s"}
              </Text>
            </Card>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { gap: spacing.sm, paddingBottom: spacing.xxl },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
