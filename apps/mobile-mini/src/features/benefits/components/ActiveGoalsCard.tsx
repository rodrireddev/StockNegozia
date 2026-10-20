import { Text, View } from "react-native";
import type { ActiveGoalDto } from "@stocknegozia/api-contracts";
import { Card } from "@/components/Card";
import { spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { useActiveGoals } from "../hooks/useActiveGoals";

/** Progreso calculado 100% por el server (`GET /gamification/goals/active`) — puede haber varios
 *  objetivos vigentes a la vez (diario + semanal + fecha específica, simultáneos). */
export function ActiveGoalsCard() {
  const { colors } = useTheme();
  const { goals } = useActiveGoals();

  if (goals.length === 0) return null;

  return (
    <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
      <Text style={[typography.bodyStrong, { color: colors.foreground }]}>Objetivos</Text>
      {goals.map((goal: ActiveGoalDto) => (
        <View key={goal.key} style={{ gap: 2 }}>
          <Text style={[typography.body, { color: colors.mutedForeground }]}>{goal.label}</Text>
          <Text
            style={[
              typography.caption,
              { color: goal.alreadyClaimed ? colors.success : colors.foreground },
            ]}
          >
            {goal.alreadyClaimed ? "¡Completado!" : `Progreso: ${goal.progress}/${goal.target}`}
          </Text>
        </View>
      ))}
    </Card>
  );
}
