import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";

const TABS = [
  { href: "/inventory", label: "Categorías" },
  { href: "/inventory/movements", label: "Movimientos" },
] as const;

/** Sub-navegación de Inventario — equivalente móvil del `TabNav` de Desktop entre Stock/
 *  Categorías/Movimientos (acá sin "Stock": Productos ya muestra esa misma información). */
export function InventoryTabs({ active }: { active: "categories" | "movements" }) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={styles.row}>
      {TABS.map((tab, index) => {
        const isActive =
          (index === 0 && active === "categories") || (index === 1 && active === "movements");
        return (
          <Pressable
            key={tab.href}
            onPress={() => router.replace(tab.href)}
            style={[styles.tab, { backgroundColor: isActive ? colors.primary : colors.secondary }]}
          >
            <Text
              style={[
                typography.label,
                { color: isActive ? colors.primaryForeground : colors.secondaryForeground },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  tab: {
    minHeight: minTouchTarget,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
