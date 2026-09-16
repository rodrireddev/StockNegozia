import { StyleSheet, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDeviceSize } from "@/hooks/useDeviceSize";
import { useTheme } from "@/theme/useTheme";
import { spacing } from "@/theme/tokens";

/**
 * Contenedor base de pantalla — respeta el safe area (notch, gesture bar de Android) y aplica
 * padding horizontal más generoso en tablet, donde el contenido angosto de un teléfono se vería
 * perdido en un ancho de pantalla mucho mayor (ver docs/mobile/MOBILE_CLIENT.md §Phone + Tablet).
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
  content: { flex: 1, paddingTop: spacing.lg },
});
