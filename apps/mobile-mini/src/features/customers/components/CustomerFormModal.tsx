import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { CustomerDto } from "@stocknegozia/api-contracts";
import { createCustomerSchema } from "@stocknegozia/validation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { TextField } from "@/components/TextField";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { useSaveCustomer } from "../hooks/useCustomers";

const EMPTY = { name: "", phone: "", email: "", documentNumber: "", notes: "" };
type Fields = typeof EMPTY;

interface CustomerFormModalProps {
  /** `"new"` para alta, un cliente para editarlo, `null` cerrado. */
  customer: CustomerDto | "new" | null;
  onClose: () => void;
}

export function CustomerFormModal({ customer, onClose }: CustomerFormModalProps) {
  const { colors } = useTheme();
  const editing = customer !== null && customer !== "new" ? customer : null;
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const save = useSaveCustomer(editing?.id ?? null);

  useEffect(() => {
    if (customer === null) return;
    setFields(
      editing
        ? {
            name: editing.name,
            phone: editing.phone ?? "",
            email: editing.email ?? "",
            documentNumber: editing.documentNumber ?? "",
            notes: editing.notes ?? "",
          }
        : EMPTY,
    );
    setFieldErrors({});
    setFormError(null);
  }, [customer, editing]);

  function handleSave() {
    setFormError(null);
    const result = createCustomerSchema.safeParse(fields);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    setFieldErrors({});
    save.mutate(result.data, {
      onSuccess: onClose,
      onError: (error) => setFormError(error.message),
    });
  }

  const set = (key: keyof Fields) => (value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));
  const errorOf = (key: keyof Fields) =>
    fieldErrors[key] ? <Text style={{ color: colors.danger }}>{fieldErrors[key][0]}</Text> : null;

  return (
    <Modal visible={customer !== null} onClose={onClose}>
      <View style={styles.content}>
        <Text style={[typography.subtitle, { color: colors.foreground }]}>
          {editing ? "Editar cliente" : "Nuevo cliente"}
        </Text>
        <TextField label="Nombre" value={fields.name} onChangeText={set("name")} />
        {errorOf("name")}
        <TextField
          label="Teléfono (opcional)"
          value={fields.phone}
          onChangeText={set("phone")}
          keyboardType="phone-pad"
        />
        <TextField
          label="Email (opcional)"
          value={fields.email}
          onChangeText={set("email")}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errorOf("email")}
        <TextField
          label="DNI / CUIT (opcional)"
          value={fields.documentNumber}
          onChangeText={set("documentNumber")}
        />
        <TextField label="Notas (opcional)" value={fields.notes} onChangeText={set("notes")} />
        {formError && <Text style={{ color: colors.danger }}>{formError}</Text>}
        <Button
          label={save.isPending ? "Guardando…" : "Guardar"}
          onPress={handleSave}
          loading={save.isPending}
        />
        <Button label="Cancelar" variant="ghost" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
});
