import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Truck } from "lucide-react-native";
import { createSupplierSchema } from "@stocknegozia/validation";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { useAuthErrorRedirect } from "@/auth/useAuthErrorRedirect";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { SupplierCard } from "../components/SupplierCard";
import { useCreateSupplier } from "../hooks/useCreateSupplier";
import { useSuppliers } from "../hooks/useSuppliers";

export function SuppliersScreen() {
  const { colors } = useTheme();
  const query = useSuppliers();
  useAuthErrorRedirect(query.error);
  const createSupplier = useCreateSupplier();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit() {
    setFormError(null);
    const result = createSupplierSchema.safeParse({ name, phone });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    setFieldErrors({});

    createSupplier.mutate(result.data, {
      onSuccess: () => {
        setName("");
        setPhone("");
      },
      onError: (error) => setFormError(error.message),
    });
  }

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
        Proveedores
      </Text>

      <View style={styles.form}>
        <TextField
          label="Nuevo proveedor"
          placeholder="Nombre del proveedor"
          value={name}
          onChangeText={setName}
        />
        {fieldErrors.name && <Text style={{ color: colors.danger }}>{fieldErrors.name[0]}</Text>}
        <TextField
          label="Teléfono (opcional)"
          placeholder="Teléfono"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        {fieldErrors.phone && <Text style={{ color: colors.danger }}>{fieldErrors.phone[0]}</Text>}
        {formError && <Text style={{ color: colors.danger }}>{formError}</Text>}
        <Button
          label={createSupplier.isPending ? "Guardando…" : "Agregar"}
          onPress={handleSubmit}
          loading={createSupplier.isPending}
        />
      </View>

      {query.isPending ? (
        <LoadingState message="Cargando proveedores…" />
      ) : query.isError ? (
        <ErrorState message="No se pudo cargar los proveedores." onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState title="No tenés proveedores todavía" icon={Truck} />
      ) : (
        <FlatList
          data={query.data}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <SupplierCard supplier={item} />}
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm, marginBottom: spacing.lg },
  listContent: { gap: spacing.sm, paddingBottom: spacing.xxl },
});
