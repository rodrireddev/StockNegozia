import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCreditConfigRevisions } from "../hooks/useCreditConfigRevisions";

export function RevisionsDialog({
  itemKey,
  itemLabel,
  onOpenChange,
}: {
  itemKey: string | null;
  itemLabel: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const revisionsQuery = useCreditConfigRevisions(itemKey);
  if (!itemKey) return null;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial — {itemLabel}</DialogTitle>
          <DialogDescription>Todos los cambios de valor de este ítem, más reciente primero.</DialogDescription>
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
                <TableHead>Cambio</TableHead>
                <TableHead>Quién</TableHead>
                <TableHead>Nota</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revisionsQuery.data.map((revision) => (
                <TableRow key={revision.id}>
                  <TableCell>{new Date(revision.changedAt).toLocaleString()}</TableCell>
                  <TableCell>
                    {revision.previousValue} → {revision.newValue}
                  </TableCell>
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
