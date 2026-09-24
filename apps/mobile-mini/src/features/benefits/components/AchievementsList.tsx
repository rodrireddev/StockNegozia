import { StyleSheet, Text, View } from "react-native";
import { Trophy } from "lucide-react-native";
import { Card } from "@/components/Card";
import { spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import { useAchievements } from "../hooks/useAchievements";

/** Sin leaderboards ni comparación con otros usuarios (doc §2) — solo los propios, en orden. */
export function AchievementsList() {
  const { colors } = useTheme();
  const { data, isLoading } = useAchievements();

  if (isLoading) return null;
  if (!data || data.length === 0) return null;

  return (
    <Card style={styles.card}>
      <Text style={[typography.bodyStrong, { color: colors.foreground }]}>Tus logros</Text>
      <View style={styles.list}>
        {data.map((achievement) => (
          <View key={achievement.key} style={styles.row}>
            <Trophy color={colors.primary} size={18} />
            <Text style={[typography.body, { color: colors.foreground, flex: 1 }]}>
              {achievement.label}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.md },
  list: { gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
