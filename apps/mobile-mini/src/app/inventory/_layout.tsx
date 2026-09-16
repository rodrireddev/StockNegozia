import { Stack } from "expo-router";

export default function InventoryLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "Categorías", headerShown: false }} />
      <Stack.Screen name="movements" options={{ title: "Movimientos", headerShown: false }} />
    </Stack>
  );
}
