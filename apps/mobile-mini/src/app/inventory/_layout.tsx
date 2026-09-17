import { Stack } from "expo-router";
import { useThemedStackScreenOptions } from "@/navigation/useThemedStackScreenOptions";

export default function InventoryLayout() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack screenOptions={{ ...screenOptions, headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "Categorías", headerShown: false }} />
      <Stack.Screen name="movements" options={{ title: "Movimientos", headerShown: false }} />
    </Stack>
  );
}
