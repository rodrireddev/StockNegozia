import type { DeviceDto } from "@stocknegozia/api-contracts";
import { useState } from "react";
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

      {devices.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {devices.isError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
          {getUserFriendlyError(devices.error)}
        </p>
      )}
      {devices.data && devices.data.length === 0 && (
        <p className="text-sm text-muted-foreground">Todavía no hay dispositivos emparejados.</p>
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
