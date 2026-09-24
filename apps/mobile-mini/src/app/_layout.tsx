import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import mobileAds, { AdsConsent } from "react-native-google-mobile-ads";
import { AccountProvider } from "@/accounts/AccountContext";
import { db } from "@/database/client";
import migrations from "@/database/migrations/migrations";
import { AdaptiveShell } from "@/navigation/AdaptiveShell";
import { getOnboardingSeen, loadOnboardingSeen, markOnboardingSeen } from "@/features/onboarding/onboardingStore";
import { OnboardingScreen } from "@/features/onboarding/screens/OnboardingScreen";
import { ThemeProvider, useThemeMode } from "@/theme/ThemeContext";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Sin backend que consultar, la "verdad" es la propia base SQLite local — igual que
      // apps/mobile, sin cache agresivo que pueda mostrar datos desactualizados.
      staleTime: 30_000,
      retry: 1,
    },
  },
});

/**
 * Espera a que la preferencia de tema (`ThemeContext.ready`) Y las migraciones de la base local
 * (`useMigrations`) resuelvan antes de esconder el splash nativo — mismo criterio que
 * `apps/mobile/src/app/_layout.tsx`, reemplazando el gate de `AuthContext` por el de la base de
 * datos (acá no hay pairing/sesión que esperar).
 */
function RootNavigator() {
  const { dark, ready: themeReady } = useThemeMode();
  const { success: migrationsReady, error: migrationError } = useMigrations(db, migrations);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(getOnboardingSeen());
  const bootstrapping =
    !themeReady || (!migrationsReady && !migrationError) || onboardingSeen === null;

  useEffect(() => {
    loadOnboardingSeen().then(setOnboardingSeen);
  }, []);

  useEffect(() => {
    if (!bootstrapping) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [bootstrapping]);

  // No bloquea el splash ni el resto del arranque — un rewarded ad recién hace falta cuando el
  // usuario entra a pedir uno (prototipo, doc ADS_CREDITS_GAMIFICATION.md), no en cada apertura.
  // `AdsConsent.gatherConsent()` (UMP) tiene que resolver ANTES de inicializar el SDK de ads —
  // pide/muestra el formulario de consentimiento si corresponde (ej. usuarios en EEA/UK), doc de
  // Google: nunca hay que inicializar ni pedir anuncios antes de eso. Si falla (sin red, etc.) se
  // sigue igual — no hay nada más que reintentar acá, y sin esto tampoco había anuncios antes.
  useEffect(() => {
    AdsConsent.gatherConsent()
      .catch(() => {})
      .finally(() => {
        mobileAds()
          .initialize()
          .catch(() => {});
      });
  }, []);

  if (bootstrapping) return null;

  if (migrationError) {
    // No hay backend al que reintentar — un fallo de migración es un problema del propio
    // dispositivo (almacenamiento corrupto/lleno). Se corta acá en vez de dejar que cada pantalla
    // falle por su cuenta contra una base a medio migrar.
    throw migrationError;
  }

  if (!onboardingSeen) {
    // Solo la primera vez que se instala la app (doc ADS_CREDITS_GAMIFICATION.md) — nunca más
    // después de esto en este dispositivo. Ver "¿Cómo funciona?" en Beneficios para volver a
    // verlo a pedido.
    return (
      <OnboardingScreen
        onFinish={() => {
          markOnboardingSeen();
          setOnboardingSeen(true);
        }}
      />
    );
  }

  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <AdaptiveShell />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AccountProvider>
            <RootNavigator />
          </AccountProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
