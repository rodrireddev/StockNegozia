import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HouseAdFormDialog, type HouseAdFormState } from "../components/HouseAdFormDialog";
import { useHouseAds } from "../hooks/useHouseAds";

export function HouseAdsPage() {
  const houseAdsQuery = useHouseAds();
  const [formState, setFormState] = useState<HouseAdFormState | null>(null);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">House ads</h1>
          <p className="text-sm text-muted-foreground">
            Fallback propio cuando AdMob no tiene fill — se muestra el habilitado de mayor prioridad.
          </p>
        </div>
        <Button onClick={() => setFormState({ mode: "create" })}>Nuevo</Button>
      </div>

      {houseAdsQuery.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {houseAdsQuery.isError && <Alert variant="destructive">{houseAdsQuery.error.message}</Alert>}

      {houseAdsQuery.data && (
        <Card>
          <CardHeader>
            <CardTitle>Anuncios propios</CardTitle>
            <CardDescription>{houseAdsQuery.data.length} configurados</CardDescription>
          </CardHeader>
          <CardContent>
            {houseAdsQuery.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay ninguno.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Impresiones</TableHead>
                    <TableHead>Última edición</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {houseAdsQuery.data.map((houseAd) => (
                    <TableRow key={houseAd.id}>
                      <TableCell>
                        <div className="font-medium">{houseAd.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {houseAd.ctaLabel} → {houseAd.ctaUrl}
                        </div>
                      </TableCell>
                      <TableCell>{houseAd.priority}</TableCell>
                      <TableCell>
                        <span className={houseAd.enabled ? "text-green-600" : "text-destructive"}>
                          {houseAd.enabled ? "Habilitado" : "Apagado"}
                        </span>
                      </TableCell>
                      <TableCell>{houseAd.impressionCount}</TableCell>
                      <TableCell className="text-muted-foreground">{houseAd.updatedByAdminEmail ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => setFormState({ mode: "edit", houseAd })}>
                            Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <HouseAdFormDialog state={formState} onOpenChange={(open) => !open && setFormState(null)} />
    </div>
  );
}
