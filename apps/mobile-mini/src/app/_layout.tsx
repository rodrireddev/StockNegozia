import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { db } from "@/database/client";
import migrations from "@/database/migrations/migrations";
import { AdaptiveShell } from "@/navigation/AdaptiveShell";
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
  const bootstrapping = !themeReady || (!migrationsReady && !migrationError);

  useEffect(() => {
    if (!bootstrapping) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [bootstrapping]);

  if (bootstrapping) return null;

  if (migrationError) {
    // No hay backend al que reintentar — un fallo de migración es un problema del propio
    // dispositivo (almacenamiento corrupto/lleno). Se corta acá en vez de dejar que cada pantalla
    // falle por su cuenta contra una base a medio migrar.
    throw migrationError;
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
          <RootNavigator />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
