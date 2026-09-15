import type { ProductDto, StockMovementDto } from "@stocknegozia/api-contracts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  describeMovementReference,
  formatMovementUnitValue,
  formatSignedQuantity,
  MOVEMENT_TYPE_LABELS,
} from "@stocknegozia/shared";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" });

interface MovementsTableProps {
  movements: StockMovementDto[];
  productsById: Map<number, ProductDto>;
}

/** `productsById` viene de una consulta separada (`GET /products?status=all`, no del propio
 *  movimiento): `StockMovementDto` intencionalmente no trae nombre/SKU del producto — no hace
 *  falta ningún cambio de backend, el join se resuelve acá con datos que la app ya carga. */
export function MovementsTable({ movements, productsById }: MovementsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Cantidad</TableHead>
          <TableHead className="text-right">Precio</TableHead>
          <TableHead className="text-right">Stock</TableHead>
          <TableHead>Referencia / motivo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((movement) => {
          const product = productsById.get(movement.productId);
          const reference = describeMovementReference(movement);
          return (
            <TableRow key={movement.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {dateFormatter.format(new Date(movement.createdAt))}
              </TableCell>
              <TableCell className="font-medium">
                {product?.name ?? `Producto #${movement.productId}`}
              </TableCell>
              <TableCell>{MOVEMENT_TYPE_LABELS[movement.type]}</TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums font-medium",
                  movement.direction === "IN"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-foreground",
                )}
              >
                {formatSignedQuantity(movement)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {formatMovementUnitValue(movement.unitValue)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{movement.stockAfter}</TableCell>
              <TableCell className="text-muted-foreground">{reference ?? "—"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
