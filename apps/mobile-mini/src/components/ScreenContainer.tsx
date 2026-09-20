import { StyleSheet, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDeviceSize } from "@/hooks/useDeviceSize";
import { useTheme } from "@/theme/useTheme";
import { maxContentWidth, spacing } from "@/theme/tokens";

/**
 * Contenedor base de pantalla — respeta el safe area (notch, gesture bar de Android), aplica
 * padding horizontal más generoso en tablet, y limita el ancho de contenido a `maxContentWidth`
 * (centrado) para que una sola columna de texto/controles no se estire de punta a punta en una
 * tablet en horizontal (ver docs/mobile/MOBILE_CLIENT.md §Phone + Tablet). Sin efecto en teléfono,
 * donde el ancho de pantalla nunca alcanza ese máximo.
 */
export function ScreenContainer({ style, children, ...props }: ViewProps) {
  const { colors } = useTheme();
  const { isTablet } = useDeviceSize();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <View
        style={[styles.content, { paddingHorizontal: isTablet ? spacing.xxxl : spacing.lg }, style]}
        {...props}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    paddingTop: spacing.lg,
    width: "100%",
    maxWidth: maxContentWidth,
    alignSelf: "center",
  },
});
