import { StyleSheet, Text, View } from "react-native";
import type { ProductDto, StockStatus } from "@stocknegozia/api-contracts";
import { formatMoney } from "@stocknegozia/shared";
import { Card } from "@/components/Card";
import { StatusPill, type StatusPillTone } from "@/components/StatusPill";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";

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

export function ProductListItem({ product }: { product: ProductDto }) {
  const { colors } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.price, { color: colors.foreground }]}>
          {formatPrice(product.salePrice)}
        </Text>
      </View>
      <Text style={[styles.meta, { color: colors.mutedForeground }]}>
        {product.sku}
        {product.categoryName ? ` · ${product.categoryName}` : ""}
      </Text>
      <View style={styles.footer}>
        <StatusPill
          label={STOCK_LABEL[product.stockStatus]}
          tone={STOCK_TONE[product.stockStatus]}
        />
        <Text style={[styles.stock, { color: colors.mutedForeground }]}>{product.stock} unid.</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  header: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  name: { ...typography.bodyStrong, flex: 1 },
  price: { ...typography.bodyStrong },
  meta: { ...typography.caption },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  stock: { ...typography.caption },
});
