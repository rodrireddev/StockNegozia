import type { ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import {
  ChevronRight,
  Gift,
  Layers,
  Settings,
  ShoppingBag,
  TrendingUp,
  Truck,
  Wallet,
  type LucideProps,
} from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Card } from "@/components/Card";
import { useCloudAccountStatus } from "@/devices/useCloudAccountStatus";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, spacing, typography } from "@/theme/tokens";

interface MoreItem {
  href: Href;
  label: string;
  description: string;
  icon: ComponentType<LucideProps>;
}

const ITEMS: MoreItem[] = [
  { href: "/purchases", label: "Compras", description: "Registrar compras", icon: ShoppingBag },
  { href: "/inventory", label: "Inventario", description: "Categorías y movimientos de stock", icon: Layers },
  { href: "/profits", label: "Ganancias", description: "Historial y gráfico de ganancias", icon: TrendingUp },
  { href: "/cash-adjustments", label: "Ajustes de caja", description: "Retiros e ingresos de caja", icon: Wallet },
  { href: "/suppliers", label: "Proveedores", description: "Ver, agregar y editar proveedores", icon: Truck },
  { href: "/settings", label: "Ajustes", description: "Este dispositivo y cerrar sesión", icon: Settings },
];

/**
 * Solo existe cuando el desktop emparejado tiene una cuenta cloud logueada (doc
 * ADS_CREDITS_GAMIFICATION.md, requisito 4) — no una entrada deshabilitada, directamente no está
 * en el array (ver `useCloudAccountStatus`).
 */
const BENEFITS_ITEM: MoreItem = {
  // `as Href`: expo-router recién agrega esta ruta al union tipado después de que el dev server la
  // vea una vez (no corrió acá) — mismo criterio que `mobile-mini/.../BenefitsScreen.tsx`.
  href: "/benefits" as Href,
  label: "Beneficios",
  description: "Créditos, objetivos y anuncios",
  icon: Gift,
};

/** Hub de teléfono para las secciones que no entran en la barra inferior (`Productos`/`Ventas`/
 *  `Más`) — en tablet estas mismas secciones están directamente en el riel lateral, ver
 *  `AdaptiveShell`. */
export function MoreScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const cloudAccountStatus = useCloudAccountStatus();
  const items = cloudAccountStatus.data?.linked ? [...ITEMS, BENEFITS_ITEM] : ITEMS;

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
        Más
      </Text>
      <View style={styles.list}>
        {items.map((item) => (
          <Pressable key={item.label} onPress={() => router.push(item.href)}>
            <Card style={styles.row}>
              <item.icon color={colors.foreground} size={22} />
              <View style={styles.rowText}>
                <Text style={[typography.bodyStrong, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  {item.description}
                </Text>
              </View>
              <ChevronRight color={colors.mutedForeground} size={20} />
            </Card>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: minTouchTarget },
  rowText: { flex: 1, gap: 2 },
});
