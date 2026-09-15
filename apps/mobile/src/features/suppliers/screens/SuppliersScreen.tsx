import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Truck } from "lucide-react-native";
import { createSupplierSchema } from "@stocknegozia/validation";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { useAuthErrorRedirect } from "@/auth/useAuthErrorRedirect";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { useCreateSupplier } from "../hooks/useCreateSupplier";
import { useSuppliers } from "../hooks/useSuppliers";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short" });

export function SuppliersScreen() {
  const { colors } = useTheme();
  const query = useSuppliers();
  useAuthErrorRedirect(query.error);
  const createSupplier = useCreateSupplier();

  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit() {
    setFormError(null);
    const result = createSupplierSchema.safeParse({ name });
    if (!result.success) {
      setFieldError(result.error.flatten().fieldErrors.name?.[0] ?? "Nombre inválido");
      return;
    }
    setFieldError(null);

    createSupplier.mutate(result.data, {
      onSuccess: () => setName(""),
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
        {fieldError && <Text style={{ color: colors.danger }}>{fieldError}</Text>}
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
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <Text style={[typography.bodyStrong, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                {dateFormatter.format(new Date(item.createdAt))}
              </Text>
            </Card>
          )}
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
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
