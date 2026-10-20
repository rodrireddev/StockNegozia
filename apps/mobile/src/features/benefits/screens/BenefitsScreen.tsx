import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useRewardedAd } from "@/features/ads/hooks/useRewardedAd";
import { spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { useCloudAccountMe } from "../hooks/useCloudAccountMe";
import { useActiveGoals } from "../hooks/useActiveGoals";

/** "90" -> "1:30" — para la cuenta regresiva antes del próximo anuncio disponible. */
function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Beneficios en `apps/mobile` (doc ADS_CREDITS_GAMIFICATION.md §6) — a propósito mucho más chico
 * que el de `mobile-mini`: solo saldo + objetivos activos + "ver anuncio". Nunca login/registro
 * (la cuenta vive en el desktop emparejado, requisito 3), nunca logros históricos ni canje de
 * entitlements (fuera de alcance en esta pasada). Esta pantalla solo aparece en el menú cuando
 * `useCloudAccountStatus` confirma que el desktop tiene sesión (ver `MoreScreen.tsx`) — si por
 * algún motivo se llega igual sin sesión (ej. el desktop se desloguea justo después), las queries
 * de abajo simplemente no están habilitadas y esta pantalla muestra su estado de carga.
 */
export function BenefitsScreen() {
  const { colors } = useTheme();
  const meQuery = useCloudAccountMe();
  const { goals } = useActiveGoals();
  const { status, lastClaim, error, eligible, ineligibleReason, secondsUntilEligible, watch } =
    useRewardedAd();

  if (meQuery.isLoading || !meQuery.data) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }

  const me = meQuery.data;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
          Beneficios
        </Text>

        <Card style={styles.card}>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>Tu saldo</Text>
          <Text style={[typography.title, { color: colors.foreground }]}>
            {me.creditBalance} créditos
          </Text>
        </Card>

        {goals.length > 0 && (
          <Card style={styles.card}>
            <Text style={[typography.bodyStrong, { color: colors.foreground }]}>Objetivos</Text>
            {goals.map((goal) => (
              <View key={goal.key} style={{ gap: 2 }}>
                <Text style={[typography.body, { color: colors.mutedForeground }]}>
                  {goal.label}
                </Text>
                <Text
                  style={[
                    typography.caption,
                    { color: goal.alreadyClaimed ? colors.success : colors.foreground },
                  ]}
                >
                  {goal.alreadyClaimed
                    ? "¡Completado!"
                    : `Progreso: ${goal.progress}/${goal.target}`}
                </Text>
              </View>
            ))}
          </Card>
        )}

        <Card style={styles.card}>
          <Text style={[typography.bodyStrong, { color: colors.foreground }]}>
            Ganá créditos gratis
          </Text>
          {status === "unavailable" ? (
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              Por ahora no podemos mostrarte anuncios acá — el resto de la app funciona igual.
            </Text>
          ) : (
            <>
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                Mirá un anuncio corto y sumá créditos a la cuenta.
              </Text>
              {error && (
                <Text style={[typography.caption, { color: colors.danger }]}>
                  No se pudo mostrar el anuncio. Probá de nuevo en unos minutos.
                </Text>
              )}
              {lastClaim && lastClaim.granted && (
                <Text style={[typography.caption, { color: colors.success }]}>
                  +{lastClaim.creditsAwarded} créditos acreditados
                </Text>
              )}
              {lastClaim && !lastClaim.granted && (
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  {lastClaim.reason === "daily_cap"
                    ? "Ya llegaste al tope de anuncios de hoy."
                    : "Todavía no pasó el tiempo de espera entre anuncios."}
                </Text>
              )}
              <View style={styles.actions}>
                <Button
                  label={
                    !eligible && ineligibleReason === "daily_cap"
                      ? "Ya viste el máximo de hoy"
                      : !eligible && secondsUntilEligible !== null
                        ? `Disponible en ${formatCountdown(secondsUntilEligible)}`
                        : "Ver anuncio"
                  }
                  onPress={watch}
                  disabled={!eligible || status === "loading" || status === "showing"}
                  loading={status === "loading" || status === "showing"}
                />
              </View>
            </>
          )}
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing.xxl },
  card: { gap: spacing.xs, marginBottom: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
