import { Text } from "react-native";
import { Card } from "@/components/Card";
import { spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { useDailyMissionProgress } from "../hooks/useDailyMissionProgress";

/** Progreso contado local (doc §6) — el backend confía en que el cliente avisa cuando se cumple. */
export function DailyMissionCard() {
  const { colors } = useTheme();
  const { mission, progress, claimed } = useDailyMissionProgress();

  if (!mission) return null;

  return (
    <Card style={{ gap: spacing.xs, marginBottom: spacing.md }}>
      <Text style={[typography.bodyStrong, { color: colors.foreground }]}>Misión de hoy</Text>
      <Text style={[typography.body, { color: colors.mutedForeground }]}>{mission.label}</Text>
      <Text style={[typography.caption, { color: claimed ? colors.success : colors.foreground }]}>
        {claimed ? "¡Completada!" : `Progreso: ${progress}/${mission.target}`}
      </Text>
    </Card>
  );
}
