import type { ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import {
  ChevronRight,
  Layers,
  Settings,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  type LucideProps,
} from "lucide-react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Card } from "@/components/Card";
import { RegistrationPromptBanner } from "@/features/benefits/components/RegistrationPromptBanner";
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
  {
    href: "/inventory",
    label: "Inventario",
    description: "Categorías y movimientos de stock",
    icon: Layers,
  },
  {
    href: "/profits",
    label: "Ganancias",
    description: "Ventas, compras, caja y cobros",
    icon: TrendingUp,
  },
  {
    href: "/cash-adjustments",
    label: "Ajustes de caja",
    description: "Retiros e ingresos de caja",
    icon: Wallet,
  },
  {
    // `as Href`: ruta nueva, ver el comentario de "Beneficios" más abajo.
    href: "/customers" as Href,
    label: "Clientes",
    description: "Clientes y cuenta corriente (fiado)",
    icon: Users,
  },
  {
    href: "/suppliers",
    label: "Proveedores",
    description: "Ver, agregar y editar proveedores",
    icon: Truck,
  },
  {
    // `as Href`: expo-router recién agrega esta ruta al union tipado de `typedRoutes` después de
    // que el dev server la vea una vez — cast puntual, no un patrón a repetir.
    href: "/benefits" as Href,
    label: "Beneficios",
    description: "Cuenta, créditos y anuncios",
    icon: Sparkles,
  },
  {
    href: "/settings",
    label: "Ajustes",
    description: "Este dispositivo y cerrar sesión",
    icon: Settings,
  },
];

/** Hub de teléfono para las secciones que no entran en la barra inferior (`Productos`/`Ventas`/
 *  `Más`) — en tablet estas mismas secciones están directamente en el riel lateral, ver
 *  `AdaptiveShell`. */
export function MoreScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
        Más
      </Text>
      <RegistrationPromptBanner />
      <View style={styles.list}>
        {ITEMS.map((item) => (
          <Pressable key={item.label} onPress={() => router.push(item.href)}>
            <Card style={styles.row}>
              <item.icon color={colors.foreground} size={22} />
              <View style={styles.rowText}>
                <Text style={[typography.bodyStrong, { color: colors.foreground }]}>
                  {item.label}
                </Text>
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
