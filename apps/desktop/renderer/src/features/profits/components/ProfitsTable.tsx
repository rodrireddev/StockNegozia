import type { ProfitEntryDto } from "@stocknegozia/api-contracts";
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
  entries: ProfitEntryDto[];
}

/** Cada fila es una línea de venta (`sale_items`), no una venta completa — una venta con varios
 *  productos aparece como varias filas, una por producto, mismo criterio que `MovementsTable`. */
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
          <TableHead>Vendedor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const actor = describeMovementActor(entry);
          return (
            <TableRow key={entry.id}>
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
