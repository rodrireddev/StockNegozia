import { Stack } from "expo-router";
import { useThemedStackScreenOptions } from "@/navigation/useThemedStackScreenOptions";

export default function PurchasesLayout() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack screenOptions={{ ...screenOptions, headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "Compras", headerShown: false }} />
    </Stack>
  );
}
