import { useState } from "react";
import type { CreditConfigItemDto } from "@stocknegozia/api-contracts";
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
import { useUpdateCreditConfigItem } from "../hooks/useUpdateCreditConfigItem";

export function EditItemDialog({
  item,
  onOpenChange,
}: {
  item: CreditConfigItemDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  if (!item) return null;

  return <EditItemDialogContent item={item} onOpenChange={onOpenChange} />;
}

/**
 * Separado del wrapper de arriba para poder usar `item` (no `item | null`) directamente en
 * `useState` — remontado por el `key={item.id}` del `Dialog`, así que el valor inicial siempre
 * corresponde al ítem que se está editando, incluso si se abre uno distinto sin cerrar el diálogo.
 */
function EditItemDialogContent({
  item,
  onOpenChange,
}: {
  item: CreditConfigItemDto;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState(item.value);
  const [note, setNote] = useState("");
  const updateMutation = useUpdateCreditConfigItem();

  return (
    <Dialog
      key={item.id}
      open
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.label}</DialogTitle>
          <DialogDescription>
            {item.key} · valor actual: {item.value} {item.unit}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            updateMutation.mutate(
              { key: item.key, input: { value, note: note.trim() || undefined } },
              { onSuccess: () => onOpenChange(false) },
            );
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-value">Nuevo valor ({item.unit})</Label>
            <Input
              id="edit-value"
              type="number"
              value={value}
              onChange={(event) => setValue(Number(event.target.value))}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-note">Nota (opcional)</Label>
            <Textarea
              id="edit-note"
              placeholder="Por qué se ajusta este número…"
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
