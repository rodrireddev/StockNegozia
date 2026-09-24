import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useAccount } from "@/accounts/AccountContext";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { useEntitlementsCatalog } from "../hooks/useEntitlementsCatalog";
import { usePurchaseEntitlement } from "../hooks/usePurchaseEntitlement";

function formatExpiry(expiresAt: string): string {
  return new Date(expiresAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Canjear créditos por backup en la nube / sacarse ads (doc §1) — el backend ya estaba probado
 * end-to-end por curl, pero no había ninguna pantalla real donde el comercio pudiera gastar sus
 * créditos en esto. Comprar mientras ya está activo extiende el vencimiento (nunca lo resetea) —
 * mismo criterio que ya usa el backend, acá solo se refleja.
 */
export function EntitlementsScreen() {
  const { colors } = useTheme();
  const { me } = useAccount();
  const catalogQuery = useEntitlementsCatalog();
  const purchaseMutation = usePurchaseEntitlement();
  const [purchasingType, setPurchasingType] = useState<string | null>(null);
  const [errorByType, setErrorByType] = useState<Record<string, string>>({});

  function handlePurchase(type: string) {
    setPurchasingType(type);
    setErrorByType((prev) => ({ ...prev, [type]: "" }));
    purchaseMutation.mutate(type, {
      onError: (err) => {
        setErrorByType((prev) => ({
          ...prev,
          [type]: err instanceof Error ? err.message : "No se pudo completar la compra",
        }));
      },
      onSettled: () => setPurchasingType(null),
    });
  }

  if (catalogQuery.isLoading) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }

  const balance = me?.creditBalance ?? 0;

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.xs }]}>
        Canjear beneficios
      </Text>
      <Text style={[typography.caption, { color: colors.mutedForeground, marginBottom: spacing.md }]}>
        Tu saldo: {balance} créditos
      </Text>

      {catalogQuery.isError && (
        <Text style={[typography.caption, { color: colors.danger }]}>No se pudo cargar el catálogo.</Text>
      )}

      {catalogQuery.data?.map((item) => {
        const isActive = item.expiresAt !== null && new Date(item.expiresAt) > new Date();
        const missingCredits = item.cost - balance;
        const error = errorByType[item.type];

        return (
          <Card key={item.type} style={styles.card}>
            <Text style={[typography.bodyStrong, { color: colors.foreground }]}>{item.label}</Text>
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>{item.description}</Text>
            {isActive ? (
              <Text style={[typography.caption, { color: colors.success }]}>
                Activo hasta el {formatExpiry(item.expiresAt!)}
              </Text>
            ) : (
              <Text style={[typography.caption, { color: colors.foreground }]}>{item.cost} créditos — 30 días</Text>
            )}
            {!isActive && missingCredits > 0 && (
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                Te faltan {missingCredits} créditos.
              </Text>
            )}
            {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
            <Button
              label={isActive ? "Extender 30 días más" : "Comprar"}
              onPress={() => handlePurchase(item.type)}
              loading={purchasingType === item.type}
              disabled={purchasingType !== null}
            />
          </Card>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs, marginBottom: spacing.md },
});
