import type { ProfitLedgerEntryDto } from "@stocknegozia/api-contracts";
import { describeMovementActor } from "@stocknegozia/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });
const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

interface ProfitsTableProps {
  entries: ProfitLedgerEntryDto[];
}

/**
 * Historial combinado: una fila es una línea de venta (`sale_items`) o un ajuste de caja — ver
 * `ProfitLedgerEntryDto`. Una venta con varios productos aparece como varias filas, una por
 * producto (mismo criterio que `MovementsTable`); un ajuste de caja no está atado a ningún
 * producto, así que "Cantidad"/"Precio unitario"/"Vendido"/"Costo" quedan en "—" para esa fila —
 * sólo afecta la columna "Ganancia". La columna "Detalle" muestra el vendedor en una venta, o el
 * motivo en un ajuste de caja.
 */
export function ProfitsTable({ entries }: ProfitsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead className="text-right">Cantidad</TableHead>
          <TableHead className="text-right">Precio unitario</TableHead>
          <TableHead className="text-right">Vendido</TableHead>
          <TableHead className="text-right">Costo</TableHead>
          <TableHead className="text-right">Ganancia</TableHead>
          <TableHead>Detalle</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          if (entry.kind === "cashAdjustment") {
            const signedAmount = entry.direction === "OUT" ? -entry.amount : entry.amount;
            return (
              <TableRow key={`cash-${entry.id}`}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {dateFormatter.format(new Date(entry.createdAt))}
                </TableCell>
                <TableCell className="font-medium">
                  {entry.direction === "OUT" ? "Retiro de caja" : "Ingreso de caja"}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">—</TableCell>
                <TableCell className="text-right text-muted-foreground">—</TableCell>
                <TableCell className="text-right text-muted-foreground">—</TableCell>
                <TableCell className="text-right text-muted-foreground">—</TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums font-medium",
                    signedAmount < 0 ? "text-destructive" : "text-success",
                  )}
                >
                  {currencyFormatter.format(signedAmount)}
                </TableCell>
                <TableCell className="text-muted-foreground">{entry.reason}</TableCell>
              </TableRow>
            );
          }

          const actor = describeMovementActor(entry);
          return (
            <TableRow key={`sale-${entry.id}`}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {dateFormatter.format(new Date(entry.createdAt))}
              </TableCell>
              <TableCell className="font-medium">{entry.productName}</TableCell>
              <TableCell className="text-right tabular-nums">{entry.quantity}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {currencyFormatter.format(entry.unitPrice)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {currencyFormatter.format(entry.revenue)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {currencyFormatter.format(entry.cost)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums font-medium",
                  entry.profit < 0 ? "text-destructive" : "text-success",
                )}
              >
                {currencyFormatter.format(entry.profit)}
              </TableCell>
              <TableCell className="text-muted-foreground">{actor ?? "—"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
