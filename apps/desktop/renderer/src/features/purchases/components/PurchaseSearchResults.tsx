import type { ProductDto } from "@stocknegozia/api-contracts";
import { formatMoney } from "@stocknegozia/shared";
import { Loader2, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StockBadge } from "@/features/products/components/StockBadge";

interface PurchaseSearchResultsProps {
  products: ProductDto[];
  isLoading: boolean;
  isError: boolean;
  hasQuery: boolean;
  onRetry: () => void;
  onSelect: (product: ProductDto) => void;
}

/**
 * Visualmente muy parecido a `SaleSearchResults` (Ventas), pero deliberadamente un componente
 * propio: la columna de precio muestra `purchasePrice` (referencia útil para cargar el costo de
 * la línea), no `salePrice` — no es la misma tabla con una prop `variant`, es una tabla distinta
 * con un significado de negocio distinto en esa columna.
 */
export function PurchaseSearchResults({
  products,
  isLoading,
  isError,
  hasQuery,
  onRetry,
  onSelect,
}: PurchaseSearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Buscando productos…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No pudimos cargar los productos. Verificá que la aplicación esté conectada e intentá
          nuevamente.
        </p>
        <Button variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <PackageSearch className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {hasQuery
            ? "No encontramos productos que coincidan con tu búsqueda."
            : "No tenés productos cargados todavía."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead className="text-right">Último costo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow
              key={product.id}
              className="cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
              tabIndex={0}
              role="button"
              aria-label={`Agregar ${product.name} a la compra`}
              onClick={() => onSelect(product)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(product);
                }
              }}
            >
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="text-muted-foreground">{product.sku}</TableCell>
              <TableCell>
                <StockBadge status={product.stockStatus} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(product.purchasePrice)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
