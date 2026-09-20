import { Loader2 } from "lucide-react";
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
import type { BackupValidationResult } from "@/types/global";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

interface RestoreConfirmDialogProps {
  /** `null` = diálogo cerrado. */
  validation: BackupValidationResult | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isRestoring: boolean;
  restoreError: string | null;
  restoreSuccess: string | null;
}

/**
 * Restaurar es la operación más peligrosa de la app — el diálogo nunca ofrece "Restaurar" para un
 * backup que no pasó la validación, y el texto de advertencia + el backup automático de seguridad
 * se muestran siempre antes de la confirmación explícita (ver docs/backup/BACKUP_RESTORE.md
 * §Doble protección).
 */
export function RestoreConfirmDialog({
  validation,
  onOpenChange,
  onConfirm,
  isRestoring,
  restoreError,
  restoreSuccess,
}: RestoreConfirmDialogProps) {
  if (!validation) return null;

  const isValid = validation.status === "valid";
  const canConfirm = isValid && !restoreSuccess;

  return (
    <Dialog open onOpenChange={(open) => !isRestoring && onOpenChange(open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isValid ? "Restaurar backup" : "Backup no válido"}</DialogTitle>
          <DialogDescription>Revisá la información antes de continuar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            <dt className="text-muted-foreground">Archivo</dt>
            <dd className="font-medium">{validation.fileName}</dd>
            <dt className="text-muted-foreground">Fecha</dt>
            <dd>
              {validation.createdAt ? dateFormatter.format(new Date(validation.createdAt)) : "—"}
            </dd>
            <dt className="text-muted-foreground">Versión</dt>
            <dd>{validation.migrationCount ?? "—"}</dd>
            <dt className="text-muted-foreground">Estado</dt>
            <dd>{isValid ? "Compatible" : "Incompatible"}</dd>
          </dl>

          {!isValid && <Alert variant="destructive">{validation.message}</Alert>}

          {isValid && !restoreSuccess && (
            <Alert variant="warning">
              Restaurar este backup reemplazará los datos actuales de StockNegozia. Los datos
              creados después de la fecha del backup podrían perderse. Antes de continuar se creará
              automáticamente un backup de seguridad de los datos actuales.
            </Alert>
          )}

          {restoreError && <Alert variant="destructive">{restoreError}</Alert>}

          {restoreSuccess && <Alert variant="success">{restoreSuccess}</Alert>}
        </div>

        <DialogFooter>
          {restoreSuccess ? (
            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRestoring}>
                Cancelar
              </Button>
              {canConfirm && (
                <Button onClick={onConfirm} disabled={isRestoring} variant="secondary">
                  {isRestoring ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Restaurando…
                    </>
                  ) : (
                    "Restaurar backup"
                  )}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
