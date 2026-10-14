import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { StatusPill, type StatusPillTone } from "@/components/StatusPill";
import { useTheme } from "@/theme/useTheme";
import type { ThemeColors } from "@/theme/colors";
import { spacing, typography } from "@/theme/tokens";
import type { StockStatus } from "@stocknegozia/api-contracts";
import { formatMoney } from "@stocknegozia/shared";
import { StockAdjustModal } from "../components/StockAdjustModal";
import { useProduct } from "../hooks/useProduct";
import { useToggleActive } from "../hooks/useToggleActive";

const STOCK_LABEL: Record<StockStatus, string> = {
  normal: "En stock",
  low: "Stock bajo",
  out: "Sin stock",
};

const STOCK_TONE: Record<StockStatus, StatusPillTone> = {
  normal: "success",
  low: "warning",
  out: "danger",
};

function formatPrice(value: number): string {
  return formatMoney(value);
}

export function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const query = useProduct(productId);
  const toggleActive = useToggleActive();
  const [adjustingStock, setAdjustingStock] = useState(false);
  const [confirmingToggle, setConfirmingToggle] = useState(false);

  if (query.isPending) {
    return (
      <ScreenContainer>
        <LoadingState message="Cargando producto…" />
      </ScreenContainer>
    );
  }

  if (query.isError) {
    return (
      <ScreenContainer>
        <ErrorState message="No se pudo cargar el producto." onRetry={query.refetch} />
      </ScreenContainer>
    );
  }

  const product = query.data;
  if (!product) {
    return (
      <ScreenContainer>
        <EmptyState title="Producto no encontrado" message="Puede haber sido eliminado." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[typography.title, { color: colors.foreground, flex: 1 }]}>
            {product.name}
          </Text>
          <StatusPill
            label={product.active ? "Activo" : "Inactivo"}
            tone={product.active ? "success" : "danger"}
          />
        </View>

        <Card style={styles.card}>
          <Row label="SKU" value={product.sku} colors={colors} />
          {product.barcode && (
            <Row label="Código de barras" value={product.barcode} colors={colors} />
          )}
          <Row label="Categoría" value={product.categoryName ?? "Sin categoría"} colors={colors} />
          {product.description && (
            <Row label="Descripción" value={product.description} colors={colors} />
          )}
        </Card>

        <Card style={styles.card}>
          <Row
            label="Precio de compra"
            value={formatPrice(product.purchasePrice)}
            colors={colors}
          />
          <Row label="Precio de venta" value={formatPrice(product.salePrice)} colors={colors} />
        </Card>

        <Card style={styles.card}>
          <View style={styles.stockRow}>
            <Text style={[typography.label, { color: colors.mutedForeground }]}>Stock</Text>
            <StatusPill
              label={STOCK_LABEL[product.stockStatus]}
              tone={STOCK_TONE[product.stockStatus]}
            />
          </View>
          <Row label="Cantidad actual" value={`${product.stock} unid.`} colors={colors} />
          <Row label="Stock mínimo" value={`${product.minimumStock} unid.`} colors={colors} />
        </Card>

        <View style={styles.actions}>
          <Button label="Editar" onPress={() => router.push(`/products/${product.id}/edit`)} />
          <Button
            label="Ajustar stock"
            variant="secondary"
            onPress={() => setAdjustingStock(true)}
          />
          <Button
            label="Ver movimientos de stock"
            variant="secondary"
            onPress={() => router.push(`/inventory/movements?productId=${product.id}`)}
          />
          <Button
            label={product.active ? "Desactivar producto" : "Reactivar producto"}
            variant={product.active ? "danger" : "primary"}
            onPress={() => setConfirmingToggle(true)}
          />
        </View>
      </ScrollView>

      <StockAdjustModal
        product={adjustingStock ? product : null}
        onClose={() => setAdjustingStock(false)}
      />

      <ConfirmDialog
        open={confirmingToggle}
        onOpenChange={setConfirmingToggle}
        title={product.active ? "¿Desactivar este producto?" : "¿Reactivar este producto?"}
        description={
          product.active
            ? "El producto dejará de aparecer en Ventas y Compras hasta que lo reactives."
            : "El producto volverá a estar disponible en Ventas y Compras."
        }
        confirmLabel={product.active ? "Desactivar" : "Reactivar"}
        variant={product.active ? "danger" : "primary"}
        isPending={toggleActive.isPending}
        onConfirm={() => {
          toggleActive.mutate(
            { id: product.id, active: !product.active },
            { onSuccess: () => setConfirmingToggle(false) },
          );
        }}
      />
    </ScreenContainer>
  );
}

function Row({ label, value, colors }: { label: string; value: string; colors: ThemeColors }) {
  return (
    <View style={styles.row}>
      <Text style={[typography.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[typography.body, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  card: { gap: spacing.sm },
  row: { gap: 2 },
  stockRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
