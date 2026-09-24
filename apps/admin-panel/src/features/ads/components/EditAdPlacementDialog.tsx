import { useState } from "react";
import type { AdPlacementDto } from "@stocknegozia/api-contracts";
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
import { useUpdateAdPlacement } from "../hooks/useUpdateAdPlacement";

export function EditAdPlacementDialog({
  placement,
  onOpenChange,
}: {
  placement: AdPlacementDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!placement) return null;
  return <EditAdPlacementDialogContent placement={placement} onOpenChange={onOpenChange} />;
}

/** Remontado por `key={placement.id}` — el valor inicial siempre corresponde al placement que se
 *  está editando, mismo criterio que `EditItemDialog` de credit-config. */
function EditAdPlacementDialogContent({
  placement,
  onOpenChange,
}: {
  placement: AdPlacementDto;
  onOpenChange: (open: boolean) => void;
}) {
  const [adNetwork, setAdNetwork] = useState(placement.adNetwork);
  const [adUnitId, setAdUnitId] = useState(placement.adUnitId);
  const [enabled, setEnabled] = useState(placement.enabled);
  const [note, setNote] = useState("");
  const updateMutation = useUpdateAdPlacement();

  return (
    <Dialog
      key={placement.id}
      open
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {placement.key} · {placement.platform}
          </DialogTitle>
          <DialogDescription>Cambiar de red/ad unit o usar el kill switch sin release nuevo.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            updateMutation.mutate(
              {
                key: placement.key,
                platform: placement.platform,
                input: { adNetwork, adUnitId, enabled, note: note.trim() || undefined },
              },
              { onSuccess: () => onOpenChange(false) },
            );
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ap-network">Red</Label>
            <Input id="ap-network" value={adNetwork} onChange={(event) => setAdNetwork(event.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ap-unit">Ad unit ID</Label>
            <Input id="ap-unit" value={adUnitId} onChange={(event) => setAdUnitId(event.target.value)} required />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <Label htmlFor="ap-enabled" className="cursor-pointer">
              Habilitado
            </Label>
            <Button
              id="ap-enabled"
              type="button"
              variant={enabled ? "default" : "outline"}
              size="sm"
              onClick={() => setEnabled((value) => !value)}
            >
              {enabled ? "Sí" : "No — kill switch"}
            </Button>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ap-note">Nota (opcional)</Label>
            <Textarea
              id="ap-note"
              placeholder="Por qué se cambia…"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          {updateMutation.isError && <Alert variant="destructive">{updateMutation.error.message}</Alert>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
