import { Stack } from "expo-router";
import { useThemedStackScreenOptions } from "@/navigation/useThemedStackScreenOptions";

export default function SettingsLayout() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack screenOptions={{ ...screenOptions, headerShown: true }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="payment-terms" options={{ title: "Medios de pago" }} />
    </Stack>
  );
}
