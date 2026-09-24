import { useState } from "react";
import type { AdPlacementDto } from "@stocknegozia/api-contracts";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdPlacementRevisionsDialog } from "../components/AdPlacementRevisionsDialog";
import { EditAdPlacementDialog } from "../components/EditAdPlacementDialog";
import { useAdPlacements } from "../hooks/useAdPlacements";

export function AdPlacementsPage() {
  const placementsQuery = useAdPlacements();
  const [editing, setEditing] = useState<AdPlacementDto | null>(null);
  const [revisionsFor, setRevisionsFor] = useState<AdPlacementDto | null>(null);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Ad placements</h1>
        <p className="text-sm text-muted-foreground">
          Qué ad unit/red usa cada plataforma — el kill switch apaga un anuncio sin release nuevo.
        </p>
      </div>

      {placementsQuery.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {placementsQuery.isError && <Alert variant="destructive">{placementsQuery.error.message}</Alert>}

      {placementsQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Placements</CardTitle>
            <CardDescription>{placementsQuery.data.length} configurados</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Red</TableHead>
                  <TableHead>Ad unit ID</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última edición</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {placementsQuery.data.map((placement) => (
                  <TableRow key={placement.id}>
                    <TableCell className="font-medium">{placement.key}</TableCell>
                    <TableCell>{placement.platform}</TableCell>
                    <TableCell>{placement.adNetwork}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">
                      {placement.adUnitId}
                    </TableCell>
                    <TableCell>
                      <span className={placement.enabled ? "text-green-600" : "text-destructive"}>
                        {placement.enabled ? "Habilitado" : "Apagado"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {placement.updatedByAdminEmail ?? "— (seed)"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setRevisionsFor(placement)}>
                          Historial
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditing(placement)}>
                          Editar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <EditAdPlacementDialog placement={editing} onOpenChange={(open) => !open && setEditing(null)} />
      <AdPlacementRevisionsDialog
        placementKey={revisionsFor?.key ?? null}
        platform={revisionsFor?.platform ?? null}
        onOpenChange={(open) => !open && setRevisionsFor(null)}
      />
    </div>
  );
}
