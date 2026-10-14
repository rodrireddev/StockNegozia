import { Stack } from "expo-router";
import { useThemedStackScreenOptions } from "@/navigation/useThemedStackScreenOptions";

/** Ganancias: hub (sin header propio) + una pantalla por vista — ventas, compras, caja, cobros.
 *  Cada pantalla de detalle pone su título con el período (`Stack.Screen` en la pantalla). */
export default function ProfitsLayout() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack screenOptions={{ ...screenOptions, headerShown: true }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="sales" options={{ title: "Ventas" }} />
      <Stack.Screen name="purchases" options={{ title: "Compras" }} />
      <Stack.Screen name="cash" options={{ title: "Caja" }} />
      <Stack.Screen name="collections" options={{ title: "Cobros" }} />
    </Stack>
  );
}
