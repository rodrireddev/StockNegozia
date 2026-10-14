import type { CashAdjustmentDto } from "@stocknegozia/api-contracts";
import { formatMoney } from "@stocknegozia/shared";
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

export function CashAdjustmentsTable({ adjustments }: { adjustments: CashAdjustmentDto[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Monto</TableHead>
          <TableHead>Motivo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {adjustments.map((adjustment) => {
          const isOut = adjustment.direction === "OUT";
          const signedAmount = isOut ? -adjustment.amount : adjustment.amount;
          return (
            <TableRow key={adjustment.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {dateFormatter.format(new Date(adjustment.createdAt))}
              </TableCell>
              <TableCell className="font-medium">{isOut ? "Retiro" : "Ingreso"}</TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums font-medium",
                  isOut ? "text-destructive" : "text-success",
                )}
              >
                {formatMoney(signedAmount)}
              </TableCell>
              <TableCell className="text-muted-foreground">{adjustment.reason}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
