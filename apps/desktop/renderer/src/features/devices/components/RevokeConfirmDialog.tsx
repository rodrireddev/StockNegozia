import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RevokeConfirmDialogProps {
  deviceName: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

/**
 * No existe reactivación (ver docs/security/NEXT_STEPS.md §Regla de revocación permanente) — el
 * diálogo lo deja explícito para que quien revoca sepa que la única vuelta atrás es un nuevo
 * pairing.
 */
export function RevokeConfirmDialog({
  deviceName,
  onOpenChange,
  onConfirm,
  isPending,
}: RevokeConfirmDialogProps) {
  return (
    <Dialog open={deviceName !== null} onOpenChange={(open) => !isPending && onOpenChange(open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revocar "{deviceName}"</DialogTitle>
          <DialogDescription>
            Este dispositivo dejará de poder acceder a StockNegozia inmediatamente. No se puede
            reactivar — si vuelve a necesitar acceso, va a tener que emparejarse de nuevo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={onConfirm} disabled={isPending}>
            {isPending ? "Revocando…" : "Revocar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
