import { useState, type FormEvent } from "react";
import type { HouseAdDto } from "@stocknegozia/api-contracts";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateHouseAd } from "../hooks/useCreateHouseAd";
import { useUpdateHouseAd } from "../hooks/useUpdateHouseAd";

export type HouseAdFormState = { mode: "create" } | { mode: "edit"; houseAd: HouseAdDto };

export function HouseAdFormDialog({
  state,
  onOpenChange,
}: {
  state: HouseAdFormState | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!state) return null;
  return <HouseAdFormDialogContent state={state} onOpenChange={onOpenChange} />;
}

/** `key` fuerza remount entre "crear" y "editar X" (o entre editar dos house ads distintos) —
 *  mismo criterio que `EditItemDialog` de credit-config. */
function HouseAdFormDialogContent({
  state,
  onOpenChange,
}: {
  state: HouseAdFormState;
  onOpenChange: (open: boolean) => void;
}) {
  const existing = state.mode === "edit" ? state.houseAd : null;
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? "");
  const [ctaLabel, setCtaLabel] = useState(existing?.ctaLabel ?? "");
  const [ctaUrl, setCtaUrl] = useState(existing?.ctaUrl ?? "");
  const [priority, setPriority] = useState(existing?.priority ?? 0);
  const [enabled, setEnabled] = useState(existing?.enabled ?? true);

  const createMutation = useCreateHouseAd();
  const updateMutation = useUpdateHouseAd();
  const mutation = state.mode === "create" ? createMutation : updateMutation;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      title: title.trim(),
      body: body.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      ctaLabel: ctaLabel.trim(),
      ctaUrl: ctaUrl.trim(),
      priority,
      enabled,
    };
    if (state.mode === "create") {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    } else {
      updateMutation.mutate({ id: state.houseAd.id, input: payload }, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog
      key={state.mode === "edit" ? state.houseAd.id : "create"}
      open
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{state.mode === "create" ? "Nuevo house ad" : "Editar house ad"}</DialogTitle>
          <DialogDescription>
            Se muestra cuando AdMob no tiene fill — el habilitado de mayor prioridad.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ha-title">Título</Label>
            <Input id="ha-title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ha-body">Texto (opcional)</Label>
            <Textarea id="ha-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={500} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ha-image">URL de imagen (opcional)</Label>
            <Input
              id="ha-image"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ha-cta-label">Texto del botón</Label>
            <Input
              id="ha-cta-label"
              value={ctaLabel}
              onChange={(event) => setCtaLabel(event.target.value)}
              required
              maxLength={40}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ha-cta-url">URL del botón</Label>
            <Input
              id="ha-cta-url"
              value={ctaUrl}
              onChange={(event) => setCtaUrl(event.target.value)}
              required
              placeholder="https://…"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ha-priority">Prioridad (más alto = se muestra primero)</Label>
            <Input
              id="ha-priority"
              type="number"
              value={priority}
              onChange={(event) => setPriority(Number(event.target.value))}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <Label htmlFor="ha-enabled" className="cursor-pointer">
              Habilitado
            </Label>
            <Button
              id="ha-enabled"
              type="button"
              variant={enabled ? "default" : "outline"}
              size="sm"
              onClick={() => setEnabled((value) => !value)}
            >
              {enabled ? "Sí" : "No"}
            </Button>
          </div>
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
