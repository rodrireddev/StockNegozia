import type { ComponentProps } from "react";
import { Stack } from "expo-router";
import { useTheme } from "@/theme/useTheme";

type StackScreenOptions = ComponentProps<typeof Stack>["screenOptions"];

/**
 * `screenOptions` para un `<Stack>` que respete el tema activo. Sin esto, React Navigation pinta
 * el header nativo con sus colores por defecto (fondo blanco, texto negro) sin importar el tema
 * de la app — el bug reportado ("el header se ve blanco en modo oscuro" al crear un producto,
 * ver `app/.../products/_layout.tsx`). Cada `_layout.tsx` con un `<Stack>` propio debe pasar esto
 * en su `screenOptions`.
 */
export function useThemedStackScreenOptions(): StackScreenOptions {
  const { colors } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.foreground,
    headerTitleStyle: { color: colors.foreground },
    headerShadowVisible: false,
  };
}
