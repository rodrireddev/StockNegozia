import type { DeviceDto } from "@stocknegozia/api-contracts";
import { Loader2, Smartphone } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getUserFriendlyError } from "@/lib/errors";
import { DeviceCard } from "../components/DeviceCard";
import { PairingDialog } from "../components/PairingDialog";
import { RevokeConfirmDialog } from "../components/RevokeConfirmDialog";
import { useDevices } from "../hooks/useDevices";
import { useMe } from "../hooks/useMe";
import { useRevokeDevice } from "../hooks/useRevokeDevice";

export function DevicesPage() {
  const devices = useDevices();
  const me = useMe();
  const revokeDevice = useRevokeDevice();
  const [pairingOpen, setPairingOpen] = useState(false);
  const [deviceToRevoke, setDeviceToRevoke] = useState<DeviceDto | null>(null);

  function handleConfirmRevoke() {
    if (!deviceToRevoke) return;
    revokeDevice.mutate(deviceToRevoke.id, {
      onSuccess: () => setDeviceToRevoke(null),
    });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dispositivos</h1>
        <Button onClick={() => setPairingOpen(true)}>Emparejar dispositivo</Button>
      </div>

      {devices.isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Cargando dispositivos…</span>
        </div>
      )}
      {devices.isError && <Alert variant="destructive">{getUserFriendlyError(devices.error)}</Alert>}
      {devices.data && devices.data.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Smartphone className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Todavía no hay dispositivos emparejados.</p>
        </div>
      )}

      <div className="space-y-3">
        {devices.data?.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            isSelf={device.id === me.data?.id}
            onRevoke={setDeviceToRevoke}
          />
        ))}
      </div>

      <PairingDialog open={pairingOpen} onOpenChange={setPairingOpen} />

      <RevokeConfirmDialog
        deviceName={deviceToRevoke?.name ?? null}
        onOpenChange={(open) => !open && setDeviceToRevoke(null)}
        onConfirm={handleConfirmRevoke}
        isPending={revokeDevice.isPending}
      />
    </div>
  );
}
