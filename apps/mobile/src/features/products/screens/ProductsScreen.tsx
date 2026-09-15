import { FlatList, StyleSheet, Text, View } from "react-native";
import { useProducts } from "@/features/products/hooks/useProducts";
import { ProductListItem } from "@/features/products/components/ProductListItem";
import { ScreenContainer } from "@/components/ScreenContainer";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { useAuthErrorRedirect } from "@/auth/useAuthErrorRedirect";
import { useDeviceSize } from "@/hooks/useDeviceSize";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

export function ProductsScreen() {
  const query = useProducts();
  const { isTablet } = useDeviceSize();
  const { colors } = useTheme();
  useAuthErrorRedirect(query.error);

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.foreground }]}>Productos</Text>

      {query.isPending ? (
        <LoadingState message="Cargando productos…" />
      ) : query.isError ? (
        <ErrorState message="No se pudieron cargar los productos." onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="Todavía no hay productos"
          message="Los productos que cargues desde StockNegozia van a aparecer acá."
        />
      ) : (
        <FlatList
          key={isTablet ? "grid" : "list"}
          data={query.data}
          keyExtractor={(item) => String(item.id)}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? styles.row : undefined}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) =>
            isTablet ? (
              <View style={styles.gridItem}>
                <ProductListItem product={item} />
              </View>
            ) : (
              <ProductListItem product={item} />
            )
          }
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.title, marginBottom: spacing.md },
  listContent: { gap: spacing.md, paddingBottom: spacing.xxl },
  row: { gap: spacing.md },
  gridItem: { flex: 1 },
});
