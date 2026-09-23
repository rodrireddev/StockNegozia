import type { ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, Slot, usePathname, type Href } from "expo-router";
import {
  Layers,
  MoreHorizontal,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Truck,
  Wallet,
  type LucideProps,
} from "lucide-react-native";
import { useDeviceSize } from "@/hooks/useDeviceSize";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, spacing, typography } from "@/theme/tokens";

interface NavItem {
  href: Href;
  label: string;
  icon: ComponentType<LucideProps>;
}

// Bottom tabs de teléfono: solo lo de mayor uso diario cabe cómodo — el resto vive un toque más
// adentro, en "Más" (ver `features/more/screens/MoreScreen.tsx`). Nunca incluye "Dispositivos"
// (administración): eso es exclusivo de Desktop, ver el plan de M15 §3/§4.
const PHONE_NAV_ITEMS: NavItem[] = [
  { href: "/products", label: "Productos", icon: Package },
  { href: "/sales", label: "Ventas", icon: ShoppingCart },
  { href: "/more", label: "Más", icon: MoreHorizontal },
];

// Riel de tablet: hay lugar para todas las secciones operativas directamente, sin el hub "Más".
const TABLET_NAV_ITEMS: NavItem[] = [
  { href: "/products", label: "Productos", icon: Package },
  { href: "/sales", label: "Ventas", icon: ShoppingCart },
  { href: "/purchases", label: "Compras", icon: ShoppingBag },
  { href: "/inventory", label: "Inventario", icon: Layers },
  { href: "/profits", label: "Ganancias", icon: TrendingUp },
  { href: "/cash-adjustments", label: "Ajustes de caja", icon: Wallet },
  { href: "/suppliers", label: "Proveedores", icon: Truck },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

/**
 * Navegación adaptativa: bottom bar en teléfono, side rail persistente en tablet — ver
 * docs/mobile/MOBILE_CLIENT.md §Phone + Tablet. Ambas variantes envuelven la misma `<Slot />`
 * (contenido ruteado por expo-router); solo cambia el "chrome" alrededor, no la lógica de negocio.
 */
export function AdaptiveShell() {
  const { isTablet } = useDeviceSize();
  const pathname = usePathname();
  const { colors } = useTheme();

  const items = (isTablet ? TABLET_NAV_ITEMS : PHONE_NAV_ITEMS).map((item) => ({
    ...item,
    active: pathname === item.href || pathname.startsWith(`${item.href}/`),
  }));

  if (isTablet) {
    return (
      <View style={styles.tabletRoot}>
        <View
          style={[
            styles.rail,
            { borderRightColor: colors.border, backgroundColor: colors.secondary },
          ]}
        >
          {items.map((item) => (
            <RailLink key={item.label} {...item} />
          ))}
        </View>
        <View style={[styles.content, { backgroundColor: colors.background }]}>
          <Slot />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.phoneRoot, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Slot />
      </View>
      <View
        style={[
          styles.bottomBar,
          { borderTopColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        {items.map((item) => (
          <TabLink key={item.label} {...item} />
        ))}
      </View>
    </View>
  );
}

function RailLink({ href, label, icon: Icon, active }: NavItem & { active: boolean }) {
  const { colors } = useTheme();
  const color = active ? colors.primary : colors.mutedForeground;

  return (
    <Link href={href} asChild>
      <Pressable
        style={styles.railItem}
        accessibilityRole="link"
        accessibilityState={{ selected: active }}
      >
        <Icon color={color} size={22} />
        <Text style={[styles.railLabel, { color }]}>{label}</Text>
      </Pressable>
    </Link>
  );
}

function TabLink({ href, label, icon: Icon, active }: NavItem & { active: boolean }) {
  const { colors } = useTheme();
  const color = active ? colors.primary : colors.mutedForeground;

  return (
    <Link href={href} asChild>
      <Pressable
        style={styles.tabItem}
        accessibilityRole="link"
        accessibilityState={{ selected: active }}
      >
        <Icon color={color} size={22} />
        <Text style={[styles.tabLabel, { color }]}>{label}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  phoneRoot: { flex: 1 },
  tabletRoot: { flex: 1, flexDirection: "row" },
  content: { flex: 1 },
  rail: {
    width: 220,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xxl,
    gap: spacing.xs,
  },
  railItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.lg,
  },
  railLabel: { ...typography.bodyStrong },
  bottomBar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: minTouchTarget,
  },
  tabLabel: { ...typography.caption },
});
