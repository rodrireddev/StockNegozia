import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import logo from "../../../../assets/images/splash-icon.png";
import { useAccount } from "@/accounts/AccountContext";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { DeleteAccountModal } from "@/features/accounts/components/DeleteAccountModal";
import { EmailVerificationReminder } from "@/features/accounts/components/EmailVerificationReminder";
import { ForgotPasswordForm } from "@/features/accounts/components/ForgotPasswordForm";
import { LoginForm } from "@/features/accounts/components/LoginForm";
import { RegisterForm } from "@/features/accounts/components/RegisterForm";
import { useAdsPrivacyOptions } from "@/features/ads/hooks/useAdsPrivacyOptions";
import { useRewardedAd } from "@/features/ads/hooks/useRewardedAd";
import { AchievementsList } from "@/features/benefits/components/AchievementsList";
import { ActiveGoalsCard } from "@/features/benefits/components/ActiveGoalsCard";
import { OnboardingRecapButton } from "@/features/onboarding/components/OnboardingRecapButton";
import { spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

/** "90" -> "1:30" — para la cuenta regresiva antes del próximo anuncio disponible. */
function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Beneficios (doc §3, cuenta opcional) — único lugar de la app donde se pide login, y solo para
 * esto: ver el saldo de créditos y mirar anuncios. El resto de `mobile-mini` sigue funcionando
 * 100% sin cuenta (doc, "Principio rector").
 */
export function BenefitsScreen() {
  const { colors } = useTheme();
  const { status, me } = useAccount();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");

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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
            Beneficios
          </Text>
          <Text style={[typography.body, { color: colors.mutedForeground, marginBottom: spacing.lg }]}>
            Creá una cuenta gratis para juntar créditos y desbloquear backup en la nube, reportes y
            más — nunca hace falta para vender o cargar stock.
          </Text>
          <Card>
            {mode === "login" && (
              <LoginForm
                onSwitchToRegister={() => setMode("register")}
                onForgotPassword={() => setMode("forgot")}
              />
            )}
            {mode === "register" && <RegisterForm onSwitchToLogin={() => setMode("login")} />}
            {mode === "forgot" && <ForgotPasswordForm onDone={() => setMode("login")} />}
          </Card>
          <OnboardingRecapButton />
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <AuthenticatedBenefits
      creditBalance={me.creditBalance}
      referralCode={me.referralCode}
      emailVerifiedAt={me.emailVerifiedAt}
    />
  );
}

function AuthenticatedBenefits({
  creditBalance,
  referralCode,
  emailVerifiedAt,
}: {
  creditBalance: number;
  referralCode: string;
  emailVerifiedAt: string | null;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const { signOut, refetchMe } = useAccount();
  const { status, lastClaim, error, eligible, ineligibleReason, secondsUntilEligible, watch } = useRewardedAd();
  const adsPrivacyOptions = useAdsPrivacyOptions();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
        Beneficios
      </Text>

      {!emailVerifiedAt && <EmailVerificationReminder />}

      <Card style={styles.card}>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>Tu saldo</Text>
        <Text style={[typography.title, { color: colors.foreground }]}>{creditBalance} créditos</Text>
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          Código de referido: {referralCode}
        </Text>
        <Button
          label="Canjear beneficios"
          // `variant` default (primary): "secondary" queda del mismo color que el fondo de
          // `Card` (`colors.secondary`), el botón se perdía visualmente contra la tarjeta.
          // `as Href`: expo-router recién agrega esta ruta al union tipado después de que el dev
          // server la vea una vez (no corrió acá) — mismo criterio que `MoreScreen.tsx`.
          onPress={() => router.push("/benefits/entitlements" as Href)}
        />
      </Card>

      <ActiveGoalsCard />
      <AchievementsList />

      <Card style={styles.card}>
        <Text style={[typography.bodyStrong, { color: colors.foreground }]}>Ganá créditos gratis</Text>
        {status === "unavailable" ? (
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            Por ahora no podemos mostrarte anuncios acá — el resto de la app funciona igual.
          </Text>
        ) : (
          <>
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>
              Mirá un anuncio corto y sumá créditos a tu cuenta.
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
            {adsPrivacyOptions.visible && (
              <Button
                label="Opciones de privacidad de anuncios"
                variant="ghost"
                onPress={adsPrivacyOptions.open}
              />
            )}
          </>
        )}
      </Card>

      <View style={styles.actions}>
        <Button label="Actualizar saldo" variant="ghost" onPress={refetchMe} />
        <OnboardingRecapButton />
        <Button label="Cerrar sesión" variant="ghost" onPress={signOut} />
      </View>

      <View style={styles.dangerZone}>
        <Button label="Eliminar mi cuenta" variant="ghost" onPress={() => setDeleteModalOpen(true)} />
      </View>
      </ScrollView>
      <DeleteAccountModal visible={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing.xxl },
  logo: { width: 88, height: 88, alignSelf: "center", marginBottom: spacing.md },
  card: { gap: spacing.xs, marginBottom: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  dangerZone: { marginTop: spacing.xl },
});
