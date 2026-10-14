import type { ProductDto } from "@stocknegozia/api-contracts";
import { formatMoney } from "@stocknegozia/shared";
import { History } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StockAdjustDialog } from "@/features/products/components/StockAdjustDialog";
import { StockBadge } from "@/features/products/components/StockBadge";

/** Pantalla de "¿qué stock tengo?" — a diferencia de `ProductsTable`, no tiene acciones de
 *  catálogo (editar/desactivar): solo ver stock, ajustarlo, y saltar al historial de ese
 *  producto. Es una tabla con propósito distinto, no la misma con menos columnas.
 *
 *  Precio compra/venta son los valores ACTUALES del producto (`products.purchasePrice`/
 *  `salePrice`, ya presentes en `ProductDto` — sin cambios de backend). Representan el estado de
 *  hoy, no el histórico de cada operación — eso vive en Movimientos (ver
 *  docs/inventory/STOCK_MOVEMENTS.md §Precio histórico). */
export function InventoryTable({ products }: { products: ProductDto[] }) {
  const navigate = useNavigate();
  const [adjustProduct, setAdjustProduct] = useState<ProductDto | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>SKU / código</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead className="text-right">Precio compra</TableHead>
            <TableHead className="text-right">Precio venta</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {product.sku}
                {product.barcode && ` · ${product.barcode}`}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {product.categoryName ?? "Sin categoría"}
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={() => setAdjustProduct(product)}
                  className="flex items-center gap-2 text-left hover:underline"
                >
                  <span>{product.stock}</span>
                  <StockBadge status={product.stockStatus} />
                </button>
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {formatMoney(product.purchasePrice)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(product.salePrice)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setAdjustProduct(product)}>
                    Ajustar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/inventory/movements?productId=${product.id}`)}
                    aria-label={`Ver movimientos de ${product.name}`}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <StockAdjustDialog
        product={adjustProduct}
        onOpenChange={(open) => !open && setAdjustProduct(null)}
      />
    </>
  );
}
