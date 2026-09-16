import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SupplierDto } from "@stocknegozia/api-contracts";
import { updateSupplierSchema } from "@stocknegozia/validation";
import { Pencil } from "lucide-react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { TextField } from "@/components/TextField";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { useUpdateSupplier } from "../hooks/useUpdateSupplier";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short" });

/**
 * Editar acá nunca reescribe compras ya creadas — cada una conserva su propio snapshot del
 * nombre del proveedor al momento de la compra (ver docs/inventory/PURCHASES.md).
 */
export function SupplierCard({ supplier }: { supplier: SupplierDto }) {
  const { colors } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(supplier.name);
  const [phone, setPhone] = useState(supplier.phone ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const updateSupplier = useUpdateSupplier(supplier.id);

  function startEditing() {
    setName(supplier.name);
    setPhone(supplier.phone ?? "");
    setFieldErrors({});
    setFormError(null);
    setIsEditing(true);
  }

  function handleSave() {
    setFormError(null);
    const result = updateSupplierSchema.safeParse({ name, phone });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    setFieldErrors({});

    updateSupplier.mutate(result.data, {
      onSuccess: () => setIsEditing(false),
      onError: (error) => setFormError(error.message),
    });
  }

  if (isEditing) {
    return (
      <Card style={styles.editCard}>
        <TextField label="Nombre" value={name} onChangeText={setName} />
        {fieldErrors.name && <Text style={{ color: colors.danger }}>{fieldErrors.name[0]}</Text>}
        <TextField
          label="Teléfono (opcional)"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        {fieldErrors.phone && <Text style={{ color: colors.danger }}>{fieldErrors.phone[0]}</Text>}
        {formError && <Text style={{ color: colors.danger }}>{formError}</Text>}
        <View style={styles.editActions}>
          <Button
            label={updateSupplier.isPending ? "Guardando…" : "Guardar"}
            onPress={handleSave}
            loading={updateSupplier.isPending}
          />
          <Button
            label="Cancelar"
            variant="ghost"
            onPress={() => setIsEditing(false)}
            disabled={updateSupplier.isPending}
          />
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.row}>
      <View>
        <Text style={[typography.bodyStrong, { color: colors.foreground }]}>{supplier.name}</Text>
        {supplier.phone && (
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            {supplier.phone}
          </Text>
        )}
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          {dateFormatter.format(new Date(supplier.createdAt))}
        </Text>
      </View>
      <Pressable
        onPress={startEditing}
        accessibilityRole="button"
        accessibilityLabel={`Editar ${supplier.name}`}
        hitSlop={8}
      >
        <Pencil color={colors.mutedForeground} size={20} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  editCard: { gap: spacing.sm },
  editActions: { flexDirection: "row", gap: spacing.sm },
});
