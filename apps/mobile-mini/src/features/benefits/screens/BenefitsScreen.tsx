import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAccount } from "@/accounts/AccountContext";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { LoginForm } from "@/features/accounts/components/LoginForm";
import { RegisterForm } from "@/features/accounts/components/RegisterForm";
import { useRewardedAd } from "@/features/ads/hooks/useRewardedAd";
import { OnboardingRecapButton } from "@/features/onboarding/components/OnboardingRecapButton";
import { spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

const STATUS_LABEL: Record<string, string> = {
  idle: "Sin cargar",
  loading: "Cargando anuncio…",
  loaded: "Listo para mostrar",
  showing: "Mostrando…",
  error: "Error",
};

/**
 * Beneficios (doc §3, cuenta opcional) — único lugar de la app donde se pide login, y solo para
 * esto: ver el saldo de créditos y mirar anuncios. El resto de `mobile-mini` sigue funcionando
 * 100% sin cuenta (doc, "Principio rector").
 */
export function BenefitsScreen() {
  const { colors } = useTheme();
  const { status, me } = useAccount();
  const [mode, setMode] = useState<"login" | "register">("login");

  if (status === "bootstrapping") {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }

  if (status === "unauthenticated" || !me) {
    return (
      <ScreenContainer>
        <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
          Beneficios
        </Text>
        <Text style={[typography.body, { color: colors.mutedForeground, marginBottom: spacing.lg }]}>
          Creá una cuenta gratis para juntar créditos y desbloquear backup en la nube, reportes y
          más — nunca hace falta para vender o cargar stock.
        </Text>
        <Card>
          {mode === "login" ? (
            <LoginForm onSwitchToRegister={() => setMode("register")} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode("login")} />
          )}
        </Card>
        <OnboardingRecapButton />
      </ScreenContainer>
    );
  }

  return <AuthenticatedBenefits creditBalance={me.creditBalance} referralCode={me.referralCode} />;
}

function AuthenticatedBenefits({
  creditBalance,
  referralCode,
}: {
  creditBalance: number;
  referralCode: string;
}) {
  const { colors } = useTheme();
  const { signOut, refetchMe } = useAccount();
  const { status, lastReward, error, load, show } = useRewardedAd();

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
        Beneficios
      </Text>

      <Card style={styles.card}>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>Tu saldo</Text>
        <Text style={[typography.title, { color: colors.foreground }]}>{creditBalance} créditos</Text>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          Código de referido: {referralCode}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={[typography.bodyStrong, { color: colors.foreground }]}>
          Ver un anuncio (modelo de prueba)
        </Text>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          Ad unit de prueba de AdMob — todavía no acredita créditos reales, solo prueba que el SDK
          carga y muestra el anuncio.
        </Text>
        <Text style={[typography.caption, { color: colors.foreground }]}>
          Estado: {STATUS_LABEL[status] ?? status}
        </Text>
        {error && <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>}
        {lastReward && (
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            Última recompensa (de prueba): {lastReward.amount} {lastReward.type}
          </Text>
        )}
        <View style={styles.actions}>
          <Button
            label="Cargar anuncio"
            variant="secondary"
            onPress={load}
            disabled={status === "loading" || status === "showing"}
            loading={status === "loading"}
          />
          <Button label="Mostrar anuncio" onPress={show} disabled={status !== "loaded"} />
        </View>
      </Card>

      <View style={styles.actions}>
        <Button label="Actualizar saldo" variant="ghost" onPress={refetchMe} />
        <OnboardingRecapButton />
        <Button label="Cerrar sesión" variant="ghost" onPress={signOut} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs, marginBottom: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
