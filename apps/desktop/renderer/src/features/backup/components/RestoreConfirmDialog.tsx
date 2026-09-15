import { Loader2 } from "lucide-react";
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

          {!isValid && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
              {validation.message}
            </p>
          )}

          {isValid && !restoreSuccess && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-400">
              Restaurar este backup reemplazará los datos actuales de StockNegozia. Los datos
              creados después de la fecha del backup podrían perderse. Antes de continuar se creará
              automáticamente un backup de seguridad de los datos actuales.
            </p>
          )}

          {restoreError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
              {restoreError}
            </p>
          )}

          {restoreSuccess && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-400">
              {restoreSuccess}
            </p>
          )}
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
