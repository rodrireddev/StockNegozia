import type { DeviceDto } from "@stocknegozia/api-contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  onRevoke: (device: DeviceDto) => void;
}

export function DeviceCard({ device, onRevoke }: DeviceCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{device.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {TYPE_LABELS[device.type]}
            {device.isAdmin ? " · Administrador" : ""}
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
        {device.active && (
          <Button variant="outline" size="sm" onClick={() => onRevoke(device)}>
            Revocar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
