import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveGoals } from "../hooks/useActiveGoals";

/** Progreso calculado 100% por el server (`GET /gamification/goals/active`) — puede haber varios
 *  objetivos vigentes a la vez (diario + semanal + fecha específica, simultáneos). */
export function ActiveGoalsCard() {
  const { goals } = useActiveGoals();

  if (goals.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Objetivos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.map((goal) => (
          <div key={goal.key} className="space-y-0.5">
            <p className="text-sm text-muted-foreground">{goal.label}</p>
            <p className={goal.alreadyClaimed ? "text-xs text-success" : "text-xs"}>
              {goal.alreadyClaimed ? "¡Completado!" : `Progreso: ${goal.progress}/${goal.target}`}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
