import { useState, type FormEvent } from "react";
import { TRACKABLE_METRICS } from "@stocknegozia/api-contracts";
import type { AchievementDefinitionDto, AchievementScheduleType } from "@stocknegozia/api-contracts";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAchievement } from "../hooks/useCreateAchievement";
import { useUpdateAchievement } from "../hooks/useUpdateAchievement";

export type AchievementFormState =
  | { mode: "create" }
  | { mode: "edit"; achievement: AchievementDefinitionDto };

const CREATABLE_CATEGORIES: { value: "scheduled_goal" | "streak_milestone"; label: string }[] = [
  { value: "scheduled_goal", label: "Objetivo programado" },
  { value: "streak_milestone", label: "Hito de racha" },
];

const SCHEDULE_TYPES_BY_CATEGORY: Record<"scheduled_goal" | "streak_milestone", { value: AchievementScheduleType; label: string }[]> = {
  scheduled_goal: [
    { value: "daily", label: "Diario" },
    { value: "weekly", label: "Semanal" },
    { value: "monthly", label: "Mensual" },
    { value: "specific_date", label: "Fecha específica" },
  ],
  streak_milestone: [{ value: "streak", label: "Día de racha" }],
};

export function AchievementFormDialog({
  state,
  onOpenChange,
}: {
  state: AchievementFormState | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!state) return null;
  return <AchievementFormDialogContent state={state} onOpenChange={onOpenChange} />;
}

function AchievementFormDialogContent({
  state,
  onOpenChange,
}: {
  state: AchievementFormState;
  onOpenChange: (open: boolean) => void;
}) {
  const existing = state.mode === "edit" ? state.achievement : null;
  const isCreate = state.mode === "create";

  const [category, setCategory] = useState<"scheduled_goal" | "streak_milestone">(
    (existing?.category as "scheduled_goal" | "streak_milestone") ?? "scheduled_goal",
  );
  const [key, setKey] = useState(existing?.key ?? "");
  const [label, setLabel] = useState(existing?.label ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [metricType, setMetricType] = useState(existing?.metricType ?? TRACKABLE_METRICS[0].key);
  const [target, setTarget] = useState(existing?.target ?? 1);
  const [scheduleType, setScheduleType] = useState<AchievementScheduleType>(
    existing?.scheduleType ?? "daily",
  );
  const [specificDate, setSpecificDate] = useState(existing?.scheduleConfig?.date ?? "");
  const [creditsAwarded, setCreditsAwarded] = useState(existing?.creditsAwarded ?? 0);
  const [active, setActive] = useState(existing?.active ?? true);
  const [note, setNote] = useState("");

  const createMutation = useCreateAchievement();
  const updateMutation = useUpdateAchievement();
  const mutation = isCreate ? createMutation : updateMutation;

  const scheduleOptions = SCHEDULE_TYPES_BY_CATEGORY[category];

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const scheduleConfig = scheduleType === "specific_date" ? { date: specificDate } : undefined;

    if (isCreate) {
      createMutation.mutate(
        {
          key: key.trim(),
          label: label.trim(),
          description: description.trim() || undefined,
          category,
          metricType: category === "scheduled_goal" ? (metricType as never) : undefined,
          target,
          scheduleType,
          scheduleConfig,
          creditsAwarded,
          active,
        },
        { onSuccess: () => onOpenChange(false) },
      );
      return;
    }

    updateMutation.mutate(
      {
        key: existing!.key,
        input: {
          label: label.trim(),
          description: description.trim() || null,
          target,
          scheduleType,
          scheduleConfig: scheduleConfig ?? null,
          creditsAwarded,
          active,
          note: note.trim() || undefined,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog
      key={isCreate ? "create" : existing!.id}
      open
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Nuevo logro" : `Editar — ${existing!.label}`}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Objetivo programado (diario/semanal/mensual/fecha específica) o hito de racha nuevo."
              : `${existing!.key} · ${existing!.category}`}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {isCreate && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ach-category">Tipo</Label>
              <Select
                id="ach-category"
                value={category}
                onChange={(event) => {
                  const next = event.target.value as "scheduled_goal" | "streak_milestone";
                  setCategory(next);
                  setScheduleType(SCHEDULE_TYPES_BY_CATEGORY[next][0]!.value);
                }}
              >
                {CREATABLE_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {isCreate && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ach-key">Key (identificador único)</Label>
              <Input
                id="ach-key"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                required
                placeholder="goal.weekly_sales_10"
                pattern="[a-z0-9._-]+"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ach-label">Label (lo que ve el usuario)</Label>
            <Input id="ach-label" value={label} onChange={(event) => setLabel(event.target.value)} required maxLength={120} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ach-description">Descripción (opcional)</Label>
            <Textarea
              id="ach-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
            />
          </div>

          {category === "scheduled_goal" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ach-metric">Métrica</Label>
              <Select
                id="ach-metric"
                value={metricType}
                disabled={!isCreate}
                onChange={(event) => setMetricType(event.target.value as never)}
              >
                {TRACKABLE_METRICS.map((metric) => (
                  <option key={metric.key} value={metric.key}>
                    {metric.label}
                  </option>
                ))}
              </Select>
              {!isCreate && (
                <p className="text-xs text-muted-foreground">La métrica no se puede cambiar después de creado.</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ach-target">
              {category === "scheduled_goal" ? "Objetivo (cantidad)" : "Día de racha"}
            </Label>
            <Input
              id="ach-target"
              type="number"
              min={1}
              value={target}
              onChange={(event) => setTarget(Number(event.target.value))}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ach-schedule">Calendario</Label>
            <Select
              id="ach-schedule"
              value={scheduleType}
              disabled={scheduleOptions.length === 1}
              onChange={(event) => setScheduleType(event.target.value as AchievementScheduleType)}
            >
              {scheduleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {scheduleType === "specific_date" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ach-date">Fecha (YYYY-MM-DD)</Label>
              <Input
                id="ach-date"
                type="date"
                value={specificDate}
                onChange={(event) => setSpecificDate(event.target.value)}
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ach-credits">Créditos que otorga</Label>
            <Input
              id="ach-credits"
              type="number"
              min={0}
              value={creditsAwarded}
              onChange={(event) => setCreditsAwarded(Number(event.target.value))}
              required
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <Label htmlFor="ach-active" className="cursor-pointer">
              Activo
            </Label>
            <Button
              id="ach-active"
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => setActive((value) => !value)}
            >
              {active ? "Sí" : "No"}
            </Button>
          </div>

          {!isCreate && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ach-note">Nota (opcional)</Label>
              <Textarea
                id="ach-note"
                placeholder="Por qué se ajusta este logro…"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          )}

          {mutation.isError && <Alert variant="destructive">{mutation.error.message}</Alert>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
