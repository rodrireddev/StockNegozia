import { Text } from "react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { CashAdjustmentsSection } from "../components/CashAdjustmentsSection";

/** Pantalla propia en el menú principal — a diferencia de Ganancias (que sólo muestra el impacto
 *  de los ajustes ya cargados), acá es donde se administran: ver el historial completo y cargar
 *  uno nuevo. Ver `features/profits/data/ledger.ts` para cómo se mezclan con las ventas en
 *  Ganancias sin vivir en la misma pantalla. */
export function CashAdjustmentsScreen() {
  const { colors } = useTheme();
  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
        Ajustes de caja
      </Text>
      <CashAdjustmentsSection />
    </ScreenContainer>
  );
}
