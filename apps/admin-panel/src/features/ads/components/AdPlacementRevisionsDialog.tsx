import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdPlacementRevisions } from "../hooks/useAdPlacementRevisions";

function diffOrValue(previous: string, next: string): string {
  return previous === next ? next : `${previous} → ${next}`;
}

function diffOrBool(previous: boolean, next: boolean): string {
  const label = (value: boolean) => (value ? "Sí" : "No");
  return previous === next ? label(next) : `${label(previous)} → ${label(next)}`;
}

export function AdPlacementRevisionsDialog({
  placementKey,
  platform,
  onOpenChange,
}: {
  placementKey: string | null;
  platform: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const revisionsQuery = useAdPlacementRevisions(placementKey, platform);
  if (!placementKey || !platform) return null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Historial — {placementKey} · {platform}
          </DialogTitle>
          <DialogDescription>Todos los cambios de este placement, más reciente primero.</DialogDescription>
        </DialogHeader>
        {revisionsQuery.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {revisionsQuery.data && revisionsQuery.data.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no tiene cambios.</p>
        )}
        {revisionsQuery.data && revisionsQuery.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cuándo</TableHead>
                <TableHead>Red</TableHead>
                <TableHead>Ad unit ID</TableHead>
                <TableHead>Habilitado</TableHead>
                <TableHead>Quién</TableHead>
                <TableHead>Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revisionsQuery.data.map((revision) => (
                <TableRow key={revision.id}>
                  <TableCell>{new Date(revision.changedAt).toLocaleString()}</TableCell>
                  <TableCell>{diffOrValue(revision.previousAdNetwork, revision.newAdNetwork)}</TableCell>
                  <TableCell>{diffOrValue(revision.previousAdUnitId, revision.newAdUnitId)}</TableCell>
                  <TableCell>{diffOrBool(revision.previousEnabled, revision.newEnabled)}</TableCell>
                  <TableCell>{revision.changedByAdminEmail}</TableCell>
                  <TableCell className="text-muted-foreground">{revision.note ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
