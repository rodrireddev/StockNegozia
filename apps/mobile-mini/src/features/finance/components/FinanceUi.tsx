import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronRight, type LucideIcon } from "lucide-react-native";
import {
  FINANCE_PERIOD_OPTIONS,
  formatMoney,
  type FinancePeriodPreset,
} from "@stocknegozia/shared";
import { Card } from "@/components/Card";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";

/**
 * Piezas chicas de las pantallas de Ganancias (Mobile y Mobile Mini). Criterio: cada pantalla
 * muestra UNA cosa (ventas, compras, caja o cobros) con pocos números grandes, y el detalle se
 * pide explícitamente ("Ver más") — en el teléfono no entra todo junto sin volverse ilegible.
 */

export function PeriodChips({
  value,
  onChange,
}: {
  value: FinancePeriodPreset;
  onChange: (preset: FinancePeriodPreset) => void;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
      style={styles.chipsScroll}
    >
      {FINANCE_PERIOD_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={`period-${option.value}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.primary : colors.secondary,
              },
            ]}
          >
            <Text
              style={[
                typography.label,
                { color: selected ? colors.primaryForeground : colors.secondaryForeground },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export type Tone = "default" | "positive" | "negative" | "warning" | "muted";

export function useToneColor(tone: Tone): string {
  const { colors } = useTheme();
  return {
    default: colors.foreground,
    positive: colors.success,
    negative: colors.danger,
    warning: colors.warning,
    muted: colors.mutedForeground,
  }[tone];
}

/** Tarjeta del hub: título + valor grande + una línea de contexto. Toda la tarjeta navega. */
export function NavCard({
  title,
  icon: Icon,
  value,
  tone = "default",
  subtitle,
  onPress,
  testID,
}: {
  title: string;
  icon: LucideIcon;
  value: number;
  tone?: Tone;
  subtitle: string;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  const valueColor = useToneColor(tone);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" testID={testID}>
      <Card style={styles.navCard}>
        <View style={styles.navHeader}>
          <Icon size={16} color={colors.mutedForeground} />
          <Text style={[typography.label, styles.flex, { color: colors.mutedForeground }]}>
            {title}
          </Text>
          <ChevronRight size={18} color={colors.mutedForeground} />
        </View>
        <Text
          style={[typography.title, { color: valueColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatMoney(value)}
        </Text>
        <Text style={[typography.caption, { color: colors.mutedForeground }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </Card>
    </Pressable>
  );
}

/** "Etiqueta ........ $ valor" — una fila por valor, nunca tres montos en una misma línea. */
export function ValueRow({
  label,
  value,
  tone = "default",
  strong,
  hint,
}: {
  label: string;
  value: number;
  tone?: Tone;
  strong?: boolean;
  hint?: string;
}) {
  const { colors } = useTheme();
  const color = useToneColor(tone);
  return (
    <View style={styles.valueRow}>
      <View style={styles.flex}>
        <Text
          style={[
            strong ? typography.label : typography.caption,
            { color: colors.mutedForeground },
          ]}
        >
          {label}
        </Text>
        {hint ? (
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>{hint}</Text>
        ) : null}
      </View>
      <Text
        style={[strong ? typography.subtitle : typography.bodyStrong, styles.amount, { color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatMoney(value)}
      </Text>
    </View>
  );
}

export function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[typography.label, styles.flex, { color: colors.mutedForeground }]}>
          {title}
        </Text>
        {action}
      </View>
      {children}
    </Card>
  );
}

export interface BarListItem {
  key: string;
  label: string;
  sublabel?: string;
  amount: number;
}

/** Lista con barra proporcional (por proveedor, por motivo, por medio de pago...). */
export function BarList({ items, barColor }: { items: BarListItem[]; barColor?: string }) {
  const { colors } = useTheme();
  const max = Math.max(0, ...items.map((item) => item.amount));
  return (
    <View style={styles.barList}>
      {items.map((item) => (
        <View key={item.key} style={styles.barItem}>
          <View style={styles.valueRow}>
            <View style={styles.flex}>
              <Text style={[typography.body, { color: colors.foreground }]} numberOfLines={1}>
                {item.label}
              </Text>
              {item.sublabel ? (
                <Text
                  style={[typography.caption, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {item.sublabel}
                </Text>
              ) : null}
            </View>
            <Text
              style={[typography.bodyStrong, styles.amount, { color: colors.foreground }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatMoney(item.amount)}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.fill,
                {
                  backgroundColor: barColor ?? colors.primary,
                  width: `${max > 0 ? Math.max(2, (item.amount / max) * 100) : 0}%`,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Botón de texto "Ver más (N)" para listas largas. */
export function ShowMoreButton({ remaining, onPress }: { remaining: number; onPress: () => void }) {
  const { colors } = useTheme();
  if (remaining <= 0) return null;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.showMore} hitSlop={8}>
      <Text style={[typography.label, { color: colors.primary }]}>Ver más ({remaining})</Text>
    </Pressable>
  );
}

/** Fila de lista compacta: título + subtítulo a la izquierda, monto a la derecha. */
export function ListRow({
  title,
  subtitle,
  amount,
  tone = "default",
  prefix = "",
}: {
  title: string;
  subtitle?: string;
  amount: number;
  tone?: Tone;
  prefix?: string;
}) {
  const { colors } = useTheme();
  const color = useToneColor(tone);
  return (
    <View style={[styles.listRow, { borderBottomColor: colors.border }]}>
      <View style={styles.flex}>
        <Text style={[typography.body, { color: colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[typography.caption, { color: colors.mutedForeground }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text
        style={[typography.bodyStrong, styles.amount, { color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {prefix}
        {formatMoney(amount)}
      </Text>
    </View>
  );
}

export function LinkButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
      style={[styles.linkButton, { borderColor: colors.border }]}
    >
      <Text style={[typography.label, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  chipsScroll: { flexGrow: 0, marginBottom: spacing.md },
  chips: { gap: spacing.sm },
  chip: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  navCard: { gap: spacing.xs },
  navHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  amount: { flexShrink: 1, maxWidth: "60%", textAlign: "right" },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  barList: { gap: spacing.md },
  barItem: { gap: spacing.xs },
  track: { height: 6, borderRadius: radius.full, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.full },
  showMore: { alignSelf: "center", paddingVertical: spacing.sm },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  linkButton: {
    minHeight: minTouchTarget,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
});
