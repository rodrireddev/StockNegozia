import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { useTheme } from "@/theme/useTheme";

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

/** Espera a que `AuthContext` resuelva el estado inicial antes de esconder el splash nativo. */
function RootNavigator() {
  const { status } = useAuth();
  const { dark } = useTheme();

  useEffect(() => {
    if (status !== "bootstrapping") {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [status]);

  if (status === "bootstrapping") return null;

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
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
