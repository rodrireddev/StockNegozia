import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Package } from "lucide-react-native";
import { useRouter } from "expo-router";
import type { ProductQueryInput } from "@stocknegozia/validation";
import { useAccount } from "@/accounts/AccountContext";
import { fetchProductByCode } from "@/data/products";
import { fireRecordActivity, fireSetupQuestClaim } from "@/features/benefits/gamificationTriggers";
import { useProducts } from "@/features/products/hooks/useProducts";
import { useCategories } from "@/features/products/hooks/useCategories";
import { ProductListItem } from "@/features/products/components/ProductListItem";
import { Button } from "@/components/Button";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { Select } from "@/components/Select";
import { TextField } from "@/components/TextField";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useDeviceSize } from "@/hooks/useDeviceSize";
import { ProductScanner } from "@/features/scanner/ProductScanner";
import type { ScanResult } from "@/features/scanner/types";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

interface ProductFiltersState {
  search: string;
  categoryId: string;
  status: ProductQueryInput["status"];
  stockStatus: ProductQueryInput["stockStatus"];
}

const DEFAULT_FILTERS: ProductFiltersState = {
  search: "",
  categoryId: "",
  status: "active",
  stockStatus: "all",
};

export function ProductsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { status: accountStatus } = useAccount();
  const { isTablet } = useDeviceSize();
  const [filters, setFilters] = useState<ProductFiltersState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [scanNotFound, setScanNotFound] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search);
  const { data: categories = [] } = useCategories();

  async function handleScanDetected(result: ScanResult) {
    // Idempotente en el backend — el logro es "usaste el scanner", no depende de si el código
    // matcheó un producto (doc §1, setup quest "first_scan"); "product_scanned" (whitelist de
    // logros) es el mismo evento, para objetivos programados que usen esta métrica.
    if (accountStatus === "authenticated") {
      fireSetupQuestClaim("first_scan");
      fireRecordActivity("product_scanned");
    }
    setScannerOpen(false);
    setScanError(null);
    setScanNotFound(null);
    setIsResolvingScan(true);
    try {
      const product = await fetchProductByCode(result.code);
      router.push(`/products/${product.id}`);
    } catch (error) {
      // "Producto no encontrado" (lookup exacto sin match) ofrece crear el producto con el código
      // precargado — cualquier otro error se muestra como error genérico.
      if (error instanceof Error && error.message === "Producto no encontrado") {
        setScanNotFound(result.code);
      } else {
        setScanError(error instanceof Error ? error.message : "No se pudo buscar el producto.");
      }
    } finally {
      setIsResolvingScan(false);
    }
  }

  const query = useProducts({
    search: debouncedSearch || undefined,
    categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
    status: filters.status,
    stockStatus: filters.stockStatus,
  });

  const hasActiveFilters =
    filters.search !== "" ||
    filters.categoryId !== "" ||
    filters.status !== DEFAULT_FILTERS.status ||
    filters.stockStatus !== DEFAULT_FILTERS.stockStatus;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Productos</Text>
        <Button label="+ Nuevo" onPress={() => router.push("/products/new")} testID="new-product" />
      </View>
      <ExportCsvButton
        fileName="productos"
        rows={query.data}
        columns={[
          { header: "Nombre", value: (p) => p.name },
          { header: "SKU", value: (p) => p.sku },
          { header: "Código de barras", value: (p) => p.barcode },
          { header: "Categoría", value: (p) => p.categoryName },
          { header: "Precio de costo", value: (p) => p.purchasePrice },
          { header: "Precio de venta", value: (p) => p.salePrice },
          { header: "Stock", value: (p) => p.stock },
          { header: "Stock mínimo", value: (p) => p.minimumStock },
          { header: "Activo", value: (p) => p.active },
        ]}
      />

      <TextField
        label="Buscar"
        placeholder="Nombre, SKU o código de barras…"
        value={filters.search}
        onChangeText={(v) => setFilters((prev) => ({ ...prev, search: v }))}
      />
      <Button
        label="📷 Escanear"
        variant="secondary"
        onPress={() => {
          setScanNotFound(null);
          setScanError(null);
          setScannerOpen(true);
        }}
        testID="scan-product-search"
      />

      {isResolvingScan && <LoadingState message="Buscando producto…" />}
      {scanError && <Text style={{ color: colors.danger }}>{scanError}</Text>}
      {scanNotFound && (
        <View style={styles.scanNotFound}>
          <Text style={{ color: colors.foreground }}>
            No encontramos ningún producto con el código "{scanNotFound}".
          </Text>
          <Button
            label="Crear producto con este código"
            onPress={() =>
              router.push({ pathname: "/products/new", params: { barcode: scanNotFound } })
            }
            testID="create-product-from-scan"
          />
        </View>
      )}

      <ProductScanner
        visible={scannerOpen}
        onDetected={handleScanDetected}
        onCancel={() => setScannerOpen(false)}
      />

      <Pressable onPress={() => setShowFilters((prev) => !prev)} style={styles.filtersToggle}>
        <Text style={{ color: colors.primary }}>
          {showFilters ? "Ocultar filtros" : "Más filtros"}
        </Text>
      </Pressable>

      {showFilters && (
        <View style={styles.filters}>
          <Select
            label="Categoría"
            value={filters.categoryId}
            options={[
              { value: "", label: "Todas las categorías" },
              ...categories.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
            onChange={(v) => setFilters((prev) => ({ ...prev, categoryId: v }))}
          />
          <Select
            label="Estado"
            value={filters.status}
            options={[
              { value: "active", label: "Activos" },
              { value: "inactive", label: "Inactivos" },
              { value: "all", label: "Todos los estados" },
            ]}
            onChange={(v) =>
              setFilters((prev) => ({ ...prev, status: v as ProductFiltersState["status"] }))
            }
          />
          <Select
            label="Stock"
            value={filters.stockStatus}
            options={[
              { value: "all", label: "Cualquier stock" },
              { value: "normal", label: "Stock normal" },
              { value: "low", label: "Stock bajo" },
              { value: "out", label: "Sin stock" },
            ]}
            onChange={(v) =>
              setFilters((prev) => ({
                ...prev,
                stockStatus: v as ProductFiltersState["stockStatus"],
              }))
            }
          />
        </View>
      )}

      {query.isPending ? (
        <LoadingState message="Cargando productos…" />
      ) : query.isError ? (
        <ErrorState message="No se pudieron cargar los productos." onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        hasActiveFilters ? (
          <EmptyState
            title="Sin resultados"
            message="No se encontraron productos con esos filtros."
            icon={Package}
          />
        ) : (
          <EmptyState
            title="Todavía no hay productos"
            message="Los productos que cargues desde StockNegozia van a aparecer acá."
            icon={Package}
          />
        )
      ) : (
        <FlatList
          key={isTablet ? "grid" : "list"}
          data={query.data}
          keyExtractor={(item) => String(item.id)}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? styles.row : undefined}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={isTablet ? styles.gridItem : undefined}
              onPress={() => router.push(`/products/${item.id}`)}
            >
              <ProductListItem product={item} />
            </Pressable>
          )}
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: { ...typography.title },
  filtersToggle: { paddingVertical: spacing.xs },
  scanNotFound: { gap: spacing.sm },
  filters: { gap: spacing.md, marginBottom: spacing.sm },
  listContent: { gap: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  row: { gap: spacing.md },
  gridItem: { flex: 1 },
});
