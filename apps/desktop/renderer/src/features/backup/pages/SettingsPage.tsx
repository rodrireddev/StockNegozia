import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BackupValidationResult, ThemePreference } from "@/types/global";
import { getUserFriendlyError } from "@/lib/errors";
import { setThemePreference, useThemeStore } from "@/stores/theme-store";
import { RestoreConfirmDialog } from "../components/RestoreConfirmDialog";
import { useCreateBackup } from "../hooks/useCreateBackup";
import { useRestoreBackup } from "../hooks/useRestoreBackup";
import { useSelectAndValidateBackup } from "../hooks/useSelectAndValidateBackup";
import { formatFileSize } from "../lib/format-file-size";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

function AppearanceCard() {
  const preference = useThemeStore((state) => state.preference);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apariencia</CardTitle>
        <CardDescription>
          Elegí cómo se ve StockNegozia. "Sistema" sigue el tema de Windows.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        {THEME_OPTIONS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={preference === option.value ? "default" : "outline"}
            onClick={() => void setThemePreference(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);
  const [backupErrorMessage, setBackupErrorMessage] = useState<string | null>(null);
  const [validation, setValidation] = useState<BackupValidationResult | null>(null);
  const [selectErrorMessage, setSelectErrorMessage] = useState<string | null>(null);
  const [restoreErrorMessage, setRestoreErrorMessage] = useState<string | null>(null);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);

  const createBackup = useCreateBackup();
  const selectAndValidate = useSelectAndValidateBackup();
  const restore = useRestoreBackup();

  function handleCreateBackup() {
    setBackupSuccessMessage(null);
    setBackupErrorMessage(null);
    createBackup.mutate(undefined, {
      onSuccess: (outcome) => {
        if (outcome.cancelled) return;
        if ("error" in outcome) {
          setBackupErrorMessage(getUserFriendlyError(new Error(outcome.error)));
          return;
        }
        setBackupSuccessMessage(
          `Backup creado: ${outcome.result.fileName} (${formatFileSize(outcome.result.sizeBytes)}) — ` +
            `${dateFormatter.format(new Date(outcome.result.createdAt))}. Guardado en ${outcome.result.filePath}.`,
        );
      },
      onError: (error) => setBackupErrorMessage(getUserFriendlyError(error)),
    });
  }

  function handleSelectBackup() {
    setSelectErrorMessage(null);
    setRestoreErrorMessage(null);
    setRestoreSuccessMessage(null);
    selectAndValidate.mutate(undefined, {
      onSuccess: (outcome) => {
        if (outcome.cancelled) return;
        if ("error" in outcome) {
          setSelectErrorMessage(getUserFriendlyError(new Error(outcome.error)));
          return;
        }
        setValidation(outcome.validation);
      },
      onError: (error) => setSelectErrorMessage(getUserFriendlyError(error)),
    });
  }

  function handleConfirmRestore() {
    setRestoreErrorMessage(null);
    restore.mutate(undefined, {
      onSuccess: (outcome) => {
        if (!outcome.success) {
          setRestoreErrorMessage(outcome.error);
          return;
        }
        setRestoreSuccessMessage(
          `Restauración completa. Se guardó un backup de los datos anteriores: ${outcome.preRestoreBackupFileName}.`,
        );
      },
      onError: (error) => setRestoreErrorMessage(getUserFriendlyError(error)),
    });
  }

  function closeRestoreDialog() {
    setValidation(null);
    setRestoreErrorMessage(null);
    setRestoreSuccessMessage(null);
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <img src="/branding/logo.png" alt="" className="h-6 w-6" />
        <h1 className="text-xl font-semibold">Configuración</h1>
      </div>

      <AppearanceCard />

      <Card>
        <CardHeader>
          <CardTitle>Backup</CardTitle>
          <CardDescription>
            Protegé los datos de tu negocio creando una copia de seguridad.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleCreateBackup} disabled={createBackup.isPending}>
            {createBackup.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando backup…
              </>
            ) : (
              "Crear backup"
            )}
          </Button>
          {backupSuccessMessage && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-400">
              {backupSuccessMessage}
            </p>
          )}
          {backupErrorMessage && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
              {backupErrorMessage}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restaurar</CardTitle>
          <CardDescription>Restaurá StockNegozia desde una copia anterior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            onClick={handleSelectBackup}
            disabled={selectAndValidate.isPending}
          >
            {selectAndValidate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analizando archivo…
              </>
            ) : (
              "Seleccionar backup"
            )}
          </Button>
          {selectErrorMessage && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
              {selectErrorMessage}
            </p>
          )}
        </CardContent>
      </Card>

      <RestoreConfirmDialog
        validation={validation}
        onOpenChange={(open) => !open && closeRestoreDialog()}
        onConfirm={handleConfirmRestore}
        isRestoring={restore.isPending}
        restoreError={restoreErrorMessage}
        restoreSuccess={restoreSuccessMessage}
      />
    </div>
  );
}
