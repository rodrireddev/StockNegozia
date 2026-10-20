import { useState } from "react";
import type {
  AchievementDefinitionCategory,
  AchievementDefinitionDto,
} from "@stocknegozia/api-contracts";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AchievementFormDialog,
  type AchievementFormState,
} from "../components/AchievementFormDialog";
import { AchievementRevisionsDialog } from "../components/AchievementRevisionsDialog";
import { useAchievements } from "../hooks/useAchievements";
import { useUpdateAchievement } from "../hooks/useUpdateAchievement";

const CATEGORY_LABELS: Record<AchievementDefinitionCategory, string> = {
  scheduled_goal: "Objetivos programados",
  streak_milestone: "Hitos de racha",
  setup_quest: "Setup quests",
};

const CATEGORY_ORDER: AchievementDefinitionCategory[] = [
  "scheduled_goal",
  "streak_milestone",
  "setup_quest",
];

function scheduleSummary(achievement: AchievementDefinitionDto): string {
  if (achievement.category === "setup_quest") return "una vez";
  if (achievement.category === "streak_milestone") return `día ${achievement.target} de racha`;
  const base =
    achievement.scheduleType === "specific_date"
      ? `fecha ${achievement.scheduleConfig?.date ?? "—"}`
      : { daily: "diario", weekly: "semanal", monthly: "mensual" }[
          achievement.scheduleType as "daily" | "weekly" | "monthly"
        ];
  return `${base} · ${achievement.target} (${achievement.metricType})`;
}

export function AchievementsPage() {
  const achievementsQuery = useAchievements();
  const updateMutation = useUpdateAchievement();
  const [formState, setFormState] = useState<AchievementFormState | null>(null);
  const [revisionsFor, setRevisionsFor] = useState<AchievementDefinitionDto | null>(null);

  const groups = achievementsQuery.data
    ? CATEGORY_ORDER.map((category) => ({
        category,
        items: achievementsQuery.data!.filter((item) => item.category === category),
      }))
    : [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Logros</h1>
          <p className="text-sm text-muted-foreground">
            Objetivos programados y hitos de racha — crear/editar/desactivar acá no requiere deploy
            de la app.
          </p>
        </div>
        <Button onClick={() => setFormState({ mode: "create" })}>Nuevo logro</Button>
      </div>

      {achievementsQuery.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {achievementsQuery.isError && (
        <Alert variant="destructive">{achievementsQuery.error.message}</Alert>
      )}

      {groups.map(({ category, items }) =>
        items.length === 0 ? null : (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{CATEGORY_LABELS[category]}</CardTitle>
              <CardDescription>{items.length} logros</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Logro</TableHead>
                    <TableHead>Calendario / objetivo</TableHead>
                    <TableHead>Créditos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Última edición</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((achievement) => (
                    <TableRow key={achievement.id}>
                      <TableCell>
                        <div className="font-medium">{achievement.label}</div>
                        <div className="text-xs text-muted-foreground">{achievement.key}</div>
                      </TableCell>
                      <TableCell className="text-sm">{scheduleSummary(achievement)}</TableCell>
                      <TableCell>{achievement.creditsAwarded}</TableCell>
                      <TableCell>
                        <span
                          className={achievement.active ? "text-green-600" : "text-destructive"}
                        >
                          {achievement.active ? "Activo" : "Desactivado"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {achievement.updatedByAdminEmail ?? "— (seed)"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRevisionsFor(achievement)}
                          >
                            Historial
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFormState({ mode: "edit", achievement })}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updateMutation.isPending}
                            onClick={() =>
                              updateMutation.mutate({
                                key: achievement.key,
                                input: { active: !achievement.active },
                              })
                            }
                          >
                            {achievement.active ? "Eliminar" : "Reactivar"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ),
      )}

      <AchievementFormDialog
        state={formState}
        onOpenChange={(open) => !open && setFormState(null)}
      />
      <AchievementRevisionsDialog
        achievementKey={revisionsFor?.key ?? null}
        achievementLabel={revisionsFor?.label ?? null}
        onOpenChange={(open) => !open && setRevisionsFor(null)}
      />
    </div>
  );
}
