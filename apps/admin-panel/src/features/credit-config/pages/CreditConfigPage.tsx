import { useState } from "react";
import type { CreditConfigItemDto } from "@stocknegozia/api-contracts";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthStore } from "@/stores/auth-store";
import { EditItemDialog } from "../components/EditItemDialog";
import { RevisionsDialog } from "../components/RevisionsDialog";
import { useCreditConfigItems } from "../hooks/useCreditConfigItems";

const CATEGORY_LABELS: Record<CreditConfigItemDto["category"], string> = {
  source: "Fuentes de créditos",
  sink: "Costos (sinks)",
};

export function CreditConfigPage() {
  const itemsQuery = useCreditConfigItems();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [editingItem, setEditingItem] = useState<CreditConfigItemDto | null>(null);
  const [revisionsFor, setRevisionsFor] = useState<CreditConfigItemDto | null>(null);

  const groups = itemsQuery.data
    ? (["source", "sink"] as const).map((category) => ({
        category,
        items: itemsQuery.data!.filter((item) => item.category === category),
      }))
    : [];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Balanceo de créditos</h1>
          <p className="text-sm text-muted-foreground">
            Editá el costo/tope de cada feature — se aplica al instante, con historial por ítem.
          </p>
        </div>
        <Button variant="outline" onClick={clearSession}>
          Salir
        </Button>
      </div>

      {itemsQuery.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {itemsQuery.isError && <Alert variant="destructive">{itemsQuery.error.message}</Alert>}

      {groups.map(({ category, items }) =>
        items.length === 0 ? null : (
          <Card key={category}>
            <CardHeader>
              <CardTitle>{CATEGORY_LABELS[category]}</CardTitle>
              <CardDescription>{items.length} ítems</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Última edición</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.key}</div>
                      </TableCell>
                      <TableCell>
                        {item.value} <span className="text-muted-foreground">{item.unit}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.updatedByAdminEmail ?? "— (seed)"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setRevisionsFor(item)}>
                            Historial
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingItem(item)}>
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
        ),
      )}

      <EditItemDialog item={editingItem} onOpenChange={(open) => !open && setEditingItem(null)} />
      <RevisionsDialog
        itemKey={revisionsFor?.key ?? null}
        itemLabel={revisionsFor?.label ?? null}
        onOpenChange={(open) => !open && setRevisionsFor(null)}
      />
    </div>
  );
}
