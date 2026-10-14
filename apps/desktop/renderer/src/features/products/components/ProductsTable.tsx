import type { ProductDto } from "@stocknegozia/api-contracts";
import { formatMoney } from "@stocknegozia/shared";
import { Package, Pencil } from "lucide-react";
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
import { useToggleActive } from "../hooks/useToggleActive";
import { ConfirmDialog } from "./ConfirmDialog";
import { StockAdjustDialog } from "./StockAdjustDialog";
import { StockBadge } from "./StockBadge";

export function ProductsTable({ products }: { products: ProductDto[] }) {
  const navigate = useNavigate();
  const toggleActive = useToggleActive();
  const [stockProduct, setStockProduct] = useState<ProductDto | null>(null);
  const [toggleTarget, setToggleTarget] = useState<ProductDto | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id} className={product.active ? undefined : "opacity-50"}>
              <TableCell>
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-secondary">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="text-muted-foreground">{product.sku}</TableCell>
              <TableCell className="text-muted-foreground">{product.categoryName ?? "—"}</TableCell>
              <TableCell>{formatMoney(product.salePrice)}</TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={() => setStockProduct(product)}
                  className="flex items-center gap-2 text-left hover:underline"
                >
                  <span>{product.stock}</span>
                  <StockBadge status={product.stockStatus} />
                </button>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/products/${product.id}/edit`)}
                    aria-label={`Editar ${product.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setToggleTarget(product)}>
                    {product.active ? "Desactivar" : "Reactivar"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <StockAdjustDialog
        product={stockProduct}
        onOpenChange={(open) => !open && setStockProduct(null)}
      />

      <ConfirmDialog
        open={toggleTarget !== null}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={toggleTarget?.active ? "¿Desactivar este producto?" : "¿Reactivar este producto?"}
        description={
          toggleTarget?.active
            ? `"${toggleTarget?.name}" dejará de aparecer en el listado activo. Podés reactivarlo cuando quieras.`
            : `"${toggleTarget?.name}" volverá a estar disponible.`
        }
        confirmLabel={toggleTarget?.active ? "Desactivar" : "Reactivar"}
        variant={toggleTarget?.active ? "secondary" : "default"}
        isPending={toggleActive.isPending}
        onConfirm={() => {
          if (!toggleTarget) return;
          toggleActive.mutate(
            { id: toggleTarget.id, active: !toggleTarget.active },
            { onSuccess: () => setToggleTarget(null) },
          );
        }}
      />
    </>
  );
}
