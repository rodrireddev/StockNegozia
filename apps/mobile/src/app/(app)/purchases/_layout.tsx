import { Stack } from "expo-router";

export default function PurchasesLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "Compras", headerShown: false }} />
      <Stack.Screen name="suppliers" options={{ title: "Proveedores" }} />
    </Stack>
  );
}
