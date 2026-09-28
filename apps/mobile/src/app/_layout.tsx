import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { getNativeAdsModule } from "@/features/ads/nativeAdsModule";
import { ThemeProvider, useThemeMode } from "@/theme/ThemeContext";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // La única "verdad" es lo que devuelve el backend en cada pantalla — sin cache agresivo que
      // pueda mostrar datos desactualizados sin que la persona lo note (M15 es de bajo volumen de
      // datos, no necesita afinar esto más).
      staleTime: 30_000,
      retry: 1,
    },
  },
});

/**
 * Espera a que `AuthContext` Y la preferencia de tema (`ThemeContext.ready`) resuelvan su estado
 * inicial antes de esconder el splash nativo — así se evita el flash "aparece claro → cambia a
 * oscuro" que ocurriría si la primera pantalla pintara antes de conocer la preferencia persistida.
 */
function RootNavigator() {
  const { status } = useAuth();
  const { dark, ready } = useThemeMode();
  const bootstrapping = status === "bootstrapping" || !ready;

  useEffect(() => {
    if (!bootstrapping) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [bootstrapping]);

  // No bloquea el splash ni el resto del arranque — un rewarded ad recién hace falta cuando el
  // usuario entra a "Beneficios" (doc ADS_CREDITS_GAMIFICATION.md §6). Mismo criterio que
  // `apps/mobile-mini/src/app/_layout.tsx`: `AdsConsent.gatherConsent()` (UMP) siempre antes de
  // inicializar el SDK. `getNativeAdsModule()` devuelve `null` en Expo Go — ahí no hay nada que
  // inicializar, el resto de la app sigue funcionando igual (ver ese archivo).
  useEffect(() => {
    const nativeAds = getNativeAdsModule();
    if (!nativeAds) return;
    nativeAds.AdsConsent.gatherConsent()
      .catch(() => {})
      .finally(() => {
        nativeAds
          .default()
          .initialize()
          .catch(() => {});
      });
  }, []);

  if (bootstrapping) return null;

  return (
    <>
      <StatusBar style={dark ? "light" : "dark"} />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
