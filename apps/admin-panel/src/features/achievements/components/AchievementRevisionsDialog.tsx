import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAchievementRevisions } from "../hooks/useAchievementRevisions";

export function AchievementRevisionsDialog({
  achievementKey,
  achievementLabel,
  onOpenChange,
}: {
  achievementKey: string | null;
  achievementLabel: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const revisionsQuery = useAchievementRevisions(achievementKey);
  if (!achievementKey) return null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Historial — {achievementLabel}</DialogTitle>
          <DialogDescription>Todos los cambios de este logro, más reciente primero.</DialogDescription>
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
                <TableHead>Cambios</TableHead>
                <TableHead>Quién</TableHead>
                <TableHead>Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revisionsQuery.data.map((revision) => {
                const changes: string[] = [];
                if (revision.previousLabel !== revision.newLabel) {
                  changes.push(`label: "${revision.previousLabel}" → "${revision.newLabel}"`);
                }
                if (revision.previousTarget !== revision.newTarget) {
                  changes.push(`objetivo: ${revision.previousTarget ?? "—"} → ${revision.newTarget ?? "—"}`);
                }
                if (revision.previousScheduleType !== revision.newScheduleType) {
                  changes.push(`calendario: ${revision.previousScheduleType} → ${revision.newScheduleType}`);
                }
                if (revision.previousCreditsAwarded !== revision.newCreditsAwarded) {
                  changes.push(`créditos: ${revision.previousCreditsAwarded} → ${revision.newCreditsAwarded}`);
                }
                if (revision.previousActive !== revision.newActive) {
                  changes.push(revision.newActive ? "reactivado" : "desactivado");
                }

                return (
                  <TableRow key={revision.id}>
                    <TableCell>{new Date(revision.changedAt).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{changes.length > 0 ? changes.join(" · ") : "sin cambios de campo"}</TableCell>
                    <TableCell>{revision.changedByAdminEmail}</TableCell>
                    <TableCell className="text-muted-foreground">{revision.note ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
