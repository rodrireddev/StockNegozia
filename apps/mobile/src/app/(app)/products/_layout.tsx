import { Stack } from "expo-router";
import { useThemedStackScreenOptions } from "@/navigation/useThemedStackScreenOptions";

export default function ProductsLayout() {
  const screenOptions = useThemedStackScreenOptions();
  return (
    <Stack screenOptions={{ ...screenOptions, headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "Productos", headerShown: false }} />
      <Stack.Screen name="new" options={{ title: "Nuevo producto" }} />
      <Stack.Screen name="[id]/index" options={{ title: "Producto" }} />
      <Stack.Screen name="[id]/edit" options={{ title: "Editar producto" }} />
    </Stack>
  );
}
