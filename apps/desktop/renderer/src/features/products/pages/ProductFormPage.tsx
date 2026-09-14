import { Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { ProductForm } from "../components/ProductForm";
import { useProduct } from "../hooks/useProduct";

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const productId = id ? Number(id) : undefined;
  const { data: product, isLoading } = useProduct(productId);

  if (productId !== undefined && isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Cargando producto…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">
        {productId !== undefined ? "Editar producto" : "Nuevo producto"}
      </h1>
      <ProductForm product={product} />
    </div>
  );
}
