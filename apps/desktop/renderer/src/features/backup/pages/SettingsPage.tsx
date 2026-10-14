import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BackupValidationResult, ThemePreference } from "@/types/global";
import { getUserFriendlyError } from "@/lib/errors";
import { setThemePreference, useThemeStore } from "@/stores/theme-store";
import { useMe } from "@/features/devices/hooks/useMe";
import { useUpdateSellerName } from "@/features/devices/hooks/useUpdateSellerName";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useUpdateSettings } from "@/features/settings/hooks/useUpdateSettings";
import { PaymentTermsCard } from "@/features/settings/components/PaymentTermsCard";
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
  // Paletas alternativas — mismas 3 y mismos colores que en Mobile/Mobile Mini (ver
  // apps/mobile/src/theme/colors.ts), pensadas para descansar la vista en sesiones largas.
  { value: "pastel", label: "Pastel" },
  { value: "solarized", label: "Solarized" },
  { value: "nord", label: "Nord" },
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
      <CardContent className="flex flex-wrap gap-2">
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

/**
 * "Nombre del negocio" reemplaza a "StockNegozia" en el encabezado del recibo PDF que genera el
 * backend (ver apps/backend/src/core/sales/sale-receipt.pdf.ts) — es un ajuste global del backend
 * (tabla `app_meta`), no de este dispositivo, así que también lo puede cambiar Mobile.
 */
function BusinessNameCard() {
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data) setValue(settings.data.businessName ?? "");
  }, [settings.data]);

  function handleSave() {
    setError(null);
    setSuccessMessage(null);
    const trimmed = value.trim();
    updateSettings.mutate(
      { businessName: trimmed.length > 0 ? trimmed : null },
      {
        onSuccess: () => setSuccessMessage("Nombre del negocio actualizado."),
        onError: (err) => setError(getUserFriendlyError(err)),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nombre del negocio</CardTitle>
        <CardDescription>
          Aparece en el encabezado del recibo PDF de venta en vez de "StockNegozia".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="business-name">Nombre del negocio</Label>
          <Input
            id="business-name"
            placeholder="Ej: Almacén Doña Rosa"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {successMessage && <p className="text-sm text-success">{successMessage}</p>}
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * "Vendedor actual" — la persona que opera este equipo, no el equipo en sí (ver
 * docs/inventory/STOCK_MOVEMENTS.md §Trazabilidad). Reemplaza al nombre del dispositivo en la
 * columna "Vendedor" del historial de movimientos para ventas/compras/ajustes hechos desde acá.
 * Solo existe en Desktop — Mobile no tiene este concepto.
 */
function SellerNameCard() {
  const me = useMe();
  const updateSellerName = useUpdateSellerName();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (me.data) setValue(me.data.sellerName ?? "");
  }, [me.data]);

  function handleSave() {
    setError(null);
    setSuccessMessage(null);
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Ingresá el nombre del vendedor actual");
      return;
    }
    updateSellerName.mutate(
      { sellerName: trimmed },
      {
        onSuccess: () => setSuccessMessage("Vendedor actual actualizado."),
        onError: (err) => setError(getUserFriendlyError(err)),
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendedor actual</CardTitle>
        <CardDescription>
          Identificá quién está operando este equipo. Este nombre reemplaza al del dispositivo en el
          historial de movimientos, y es obligatorio para poder registrar ventas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="seller-name">Coloque el nombre del vendedor actual</Label>
          <Input
            id="seller-name"
            placeholder="Ej: Rodrigo"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {successMessage && <p className="text-sm text-success">{successMessage}</p>}
        <Button onClick={handleSave} disabled={updateSellerName.isPending}>
          {updateSellerName.isPending ? "Guardando…" : "Guardar"}
        </Button>
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
      <h1 className="text-xl font-semibold">Configuración</h1>

      <BusinessNameCard />
      <SellerNameCard />
      <PaymentTermsCard />
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
          {backupSuccessMessage && <Alert variant="success">{backupSuccessMessage}</Alert>}
          {backupErrorMessage && <Alert variant="destructive">{backupErrorMessage}</Alert>}
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
          {selectErrorMessage && <Alert variant="destructive">{selectErrorMessage}</Alert>}
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
