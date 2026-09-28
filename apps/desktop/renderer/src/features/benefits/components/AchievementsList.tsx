import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAchievements } from "../hooks/useAchievements";

/** Sin leaderboards ni comparación con otros usuarios (doc §2) — solo los propios, en orden. */
export function AchievementsList() {
  const { achievements, isLoading } = useAchievements();

  if (isLoading || achievements.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tus logros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {achievements.map((achievement) => (
          <div key={achievement.key} className="flex items-center gap-2">
            <Trophy className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm">{achievement.label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
