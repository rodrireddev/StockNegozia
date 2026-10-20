import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { BookUser, Pencil, Users } from "lucide-react-native";
import type { CustomerDto } from "@stocknegozia/api-contracts";
import { formatMoney } from "@stocknegozia/shared";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ExportCsvButton } from "@/components/ExportCsvButton";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { useTheme } from "@/theme/useTheme";
import { minTouchTarget, spacing, typography } from "@/theme/tokens";
import { CustomerAccountModal } from "../components/CustomerAccountModal";
import { CustomerFormModal } from "../components/CustomerFormModal";
import { useCustomers } from "../hooks/useCustomers";

export function CustomersScreen() {
  const { colors } = useTheme();
  const query = useCustomers();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<CustomerDto | "new" | null>(null);
  const [accountOf, setAccountOf] = useState<CustomerDto | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || !query.data) return query.data;
    return query.data.filter((c) =>
      [c.name, c.phone, c.email, c.documentNumber].some((v) => v?.toLowerCase().includes(term)),
    );
  }, [query.data, search]);

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
        Clientes
      </Text>
      <View style={styles.header}>
        <Button label="+ Nuevo cliente" onPress={() => setEditing("new")} />
        <TextField
          label="Buscar"
          placeholder="Nombre, teléfono, email o documento"
          value={search}
          onChangeText={setSearch}
        />
        <ExportCsvButton
          fileName="clientes"
          rows={filtered}
          columns={[
            { header: "Nombre", value: (c) => c.name },
            { header: "Teléfono", value: (c) => c.phone },
            { header: "Email", value: (c) => c.email },
            { header: "DNI / CUIT", value: (c) => c.documentNumber },
            { header: "Compras", value: (c) => c.salesCount },
            { header: "Total comprado", value: (c) => c.totalSpent },
            { header: "Saldo cuenta corriente", value: (c) => c.balance },
          ]}
        />
      </View>

      {query.isPending ? (
        <LoadingState message="Cargando clientes…" />
      ) : query.isError ? (
        <ErrorState message="No se pudo cargar los clientes." onRetry={query.refetch} />
      ) : query.data.length === 0 ? (
        <EmptyState title="No tenés clientes todavía" icon={Users} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <View style={styles.flex}>
                <Text style={[typography.bodyStrong, { color: colors.foreground }]}>
                  {item.name}
                </Text>
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  {item.salesCount} {item.salesCount === 1 ? "compra" : "compras"} ·{" "}
                  {formatMoney(item.totalSpent)}
                </Text>
                {item.balance !== 0 ? (
                  <Text
                    style={[
                      typography.label,
                      { color: item.balance > 0 ? colors.warning : colors.success },
                    ]}
                  >
                    {item.balance > 0
                      ? `Debe ${formatMoney(item.balance)}`
                      : `A favor ${formatMoney(-item.balance)}`}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityLabel={`Cuenta corriente de ${item.name}`}
                onPress={() => setAccountOf(item)}
                style={styles.iconButton}
              >
                <BookUser size={20} color={colors.foreground} />
              </Pressable>
              <Pressable
                accessibilityLabel={`Editar ${item.name}`}
                onPress={() => setEditing(item)}
                style={styles.iconButton}
              >
                <Pencil size={20} color={colors.foreground} />
              </Pressable>
            </Card>
          )}
          refreshing={query.isRefetching}
          onRefresh={query.refetch}
        />
      )}

      <CustomerFormModal customer={editing} onClose={() => setEditing(null)} />
      <CustomerAccountModal customer={accountOf} onClose={() => setAccountOf(null)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.lg },
  listContent: { gap: spacing.sm, paddingBottom: spacing.xxl },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1 },
  iconButton: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
});
