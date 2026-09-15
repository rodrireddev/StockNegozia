import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { Modal } from "@/components/Modal";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, radius, spacing, typography } from "@/theme/tokens";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  testID?: string;
}

/**
 * Picker táctil: un `Pressable` que muestra la opción elegida y abre una lista scrolleable en un
 * `Modal` — reemplazo de `<select>` de Desktop, sin depender de ningún picker nativo específico de
 * plataforma (mismo look en Android e iOS, ver docs/mobile/MOBILE_CLIENT.md §UI).
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Seleccionar…",
  testID,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={[styles.trigger, { borderColor: colors.border, backgroundColor: colors.background }]}
      >
        <Text
          style={[
            styles.triggerText,
            { color: selected ? colors.foreground : colors.mutedForeground },
          ]}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown color={colors.mutedForeground} size={18} />
      </Pressable>

      <Modal visible={open} onClose={() => setOpen(false)}>
        <Text style={[styles.modalTitle, { color: colors.foreground }]}>{label}</Text>
        <FlatList
          data={options}
          keyExtractor={(option) => option.value}
          renderItem={({ item }) => (
            <Pressable
              style={styles.option}
              accessibilityRole="button"
              onPress={() => {
                onChange(item.value);
                setOpen(false);
              }}
            >
              <Text style={[styles.optionText, { color: colors.foreground }]}>{item.label}</Text>
              {item.value === value && <Check color={colors.primary} size={18} />}
            </Pressable>
          )}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { ...typography.label },
  trigger: {
    minHeight: minTouchTarget,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  triggerText: { ...typography.body, flex: 1 },
  modalTitle: { ...typography.subtitle, marginBottom: spacing.md },
  option: {
    minHeight: minTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  optionText: { ...typography.body, flex: 1 },
});
