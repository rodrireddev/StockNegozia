import type { DeviceDto } from "@stocknegozia/api-contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { getUserFriendlyError } from "@/lib/errors";
import { useUpdateDeviceRole } from "../hooks/useUpdateDeviceRole";

const relativeTimeFormatter = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });

/** "Hace 2 min", "Hace 3 h", etc. — suficiente para esta pantalla, sin una librería nueva. */
function formatRelativeTime(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (Math.abs(diffMinutes) < 60) return relativeTimeFormatter.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return relativeTimeFormatter.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  return relativeTimeFormatter.format(diffDays, "day");
}

const TYPE_LABELS: Record<DeviceDto["type"], string> = {
  desktop: "Escritorio",
  web: "Web",
  mobile: "Celular",
  tablet: "Tablet",
  other: "Otro",
};

interface DeviceCardProps {
  device: DeviceDto;
  /** El dispositivo con el que se está usando el Desktop en este momento. */
  isSelf: boolean;
  onRevoke: (device: DeviceDto) => void;
}

/**
 * Nunca se ofrece "Revocar" sobre el propio dispositivo — más allá de que el backend ya bloquea
 * la auto-revocación del único administrador activo (ver docs/security/DEVICE_MANAGEMENT.md
 * §Protección contra auto-revocación), dejar el botón habilitado invitaría a un 409 confuso o, si
 * alguna vez existiera más de un administrador, a cortar la propia sesión sin aviso. Quien quiere
 * revocar este dispositivo tiene que hacerlo desde otro dispositivo administrador.
 */
export function DeviceCard({ device, isSelf, onRevoke }: DeviceCardProps) {
  const updateRole = useUpdateDeviceRole(device.id);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{device.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {TYPE_LABELS[device.type]}
            {device.isAdmin ? " · Administrador" : ""}
            {isSelf ? " · Este dispositivo" : ""}
          </p>
        </div>
        <Badge variant={device.active ? "success" : "destructive"}>
          {device.active ? "Autorizado" : "Revocado"}
        </Badge>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {device.lastSeenAt
            ? `Visto ${formatRelativeTime(device.lastSeenAt)}`
            : "Todavía no se conectó"}
        </p>
        <div className="flex items-center gap-2">
          {/* El administrador siempre tiene acceso completo: no tiene sentido ofrecerle un rol. */}
          {device.active && !device.isAdmin && (
            <Select
              aria-label={`Rol de ${device.name}`}
              className="h-8 w-32"
              value={device.role}
              disabled={updateRole.isPending}
              onChange={(event) => updateRole.mutate(event.target.value as DeviceDto["role"])}
            >
              <option value="manager">Encargado</option>
              <option value="cashier">Cajero</option>
            </Select>
          )}
          {device.active && !isSelf && (
            <Button variant="outline" size="sm" onClick={() => onRevoke(device)}>
              Revocar
            </Button>
          )}
        </div>
      </CardContent>
      {updateRole.isError && (
        <p className="px-6 pb-4 text-sm text-destructive">
          {getUserFriendlyError(updateRole.error)}
        </p>
      )}
    </Card>
  );
}
