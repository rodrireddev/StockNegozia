import type { ProductDto } from "@stocknegozia/api-contracts";
import { createProductSchema, updateProductSchema } from "@stocknegozia/validation";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { useCategories } from "../hooks/useCategories";
import { useCreateProduct } from "../hooks/useCreateProduct";
import { useUpdateProduct } from "../hooks/useUpdateProduct";

const NEW_CATEGORY_VALUE = "__new__";
const NEW_SUPPLIER_VALUE = "__new__";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

interface ProductFormState {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  categorySelect: string;
  categoryName: string;
  purchasePrice: string;
  salePrice: string;
  stock: string;
  minimumStock: string;
  supplierSelect: string;
  supplierName: string;
  image: string;
  active: boolean;
}

function toFormState(product?: ProductDto): ProductFormState {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    description: product?.description ?? "",
    categorySelect: product?.categoryId ? String(product.categoryId) : "",
    categoryName: "",
    purchasePrice: product ? String(product.purchasePrice) : "",
    salePrice: product ? String(product.salePrice) : "",
    stock: product ? String(product.stock) : "0",
    minimumStock: product ? String(product.minimumStock) : "0",
    supplierSelect: "",
    supplierName: "",
    image: product?.image ?? "",
    active: product?.active ?? true,
  };
}

export function ProductForm({ product }: { product?: ProductDto }) {
  const isEdit = product !== undefined;
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(product?.id ?? 0);

  const [form, setForm] = useState<ProductFormState>(() => toFormState(product));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const isPending = createProduct.isPending || updateProduct.isPending;

  function update<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageError(null);
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("La imagen no puede superar los 2MB");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("image", reader.result as string);
    reader.readAsDataURL(file);
  }

  function buildBasePayload() {
    return {
      name: form.name,
      sku: form.sku,
      barcode: form.barcode,
      description: form.description,
      categoryId:
        form.categorySelect && form.categorySelect !== NEW_CATEGORY_VALUE
          ? form.categorySelect
          : undefined,
      categoryName: form.categorySelect === NEW_CATEGORY_VALUE ? form.categoryName : undefined,
      purchasePrice: form.purchasePrice,
      salePrice: form.salePrice,
      minimumStock: form.minimumStock,
      image: form.image,
      active: form.active,
    };
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const onSuccess = () => navigate("/products");
    const onError = (error: Error) => setFormError(error.message);

    if (isEdit) {
      const result = updateProductSchema.safeParse(buildBasePayload());
      if (!result.success) {
        setFieldErrors(result.error.flatten().fieldErrors as Record<string, string[]>);
        return;
      }
      setFieldErrors({});
      updateProduct.mutate(result.data, { onSuccess, onError });
    } else {
      const result = createProductSchema.safeParse({
        ...buildBasePayload(),
        stock: form.stock,
        supplierId:
          form.supplierSelect && form.supplierSelect !== NEW_SUPPLIER_VALUE
            ? form.supplierSelect
            : undefined,
        supplierName: form.supplierSelect === NEW_SUPPLIER_VALUE ? form.supplierName : undefined,
      });
      if (!result.success) {
        setFieldErrors(result.error.flatten().fieldErrors as Record<string, string[]>);
        return;
      }
      setFieldErrors({});
      createProduct.mutate(result.data, { onSuccess, onError });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {formError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="name">Nombre *</Label>
          <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
          {fieldErrors.name && (
            <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.name[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sku">SKU *</Label>
          <Input id="sku" value={form.sku} onChange={(e) => update("sku", e.target.value)} />
          {fieldErrors.sku && (
            <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.sku[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="barcode">Código de barras</Label>
          <Input
            id="barcode"
            value={form.barcode}
            onChange={(e) => update("barcode", e.target.value)}
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category">Categoría</Label>
          <Select
            id="category"
            value={form.categorySelect}
            onChange={(e) => update("categorySelect", e.target.value)}
          >
            <option value="">Sin categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            <option value={NEW_CATEGORY_VALUE}>+ Nueva categoría…</option>
          </Select>
        </div>

        {form.categorySelect === NEW_CATEGORY_VALUE && (
          <div className="space-y-1.5">
            <Label htmlFor="categoryName">Nombre de la nueva categoría</Label>
            <Input
              id="categoryName"
              value={form.categoryName}
              onChange={(e) => update("categoryName", e.target.value)}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="purchasePrice">Precio de compra *</Label>
          <Input
            id="purchasePrice"
            type="number"
            min={0}
            step="0.01"
            value={form.purchasePrice}
            onChange={(e) => update("purchasePrice", e.target.value)}
          />
          {fieldErrors.purchasePrice && (
            <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.purchasePrice[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="salePrice">Precio de venta *</Label>
          <Input
            id="salePrice"
            type="number"
            min={0}
            step="0.01"
            value={form.salePrice}
            onChange={(e) => update("salePrice", e.target.value)}
          />
          {fieldErrors.salePrice && (
            <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.salePrice[0]}</p>
          )}
        </div>

        {!isEdit && (
          <div className="space-y-1.5">
            <Label htmlFor="stock">Stock inicial</Label>
            <Input
              id="stock"
              type="number"
              min={0}
              step={1}
              value={form.stock}
              onChange={(e) => update("stock", e.target.value)}
            />
          </div>
        )}

        {!isEdit && form.stock !== "0" && (
          <div className="space-y-1.5">
            <Label htmlFor="supplier">Proveedor del stock inicial *</Label>
            <Select
              id="supplier"
              value={form.supplierSelect}
              onChange={(e) => update("supplierSelect", e.target.value)}
            >
              <option value="">Seleccionar proveedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
              <option value={NEW_SUPPLIER_VALUE}>+ Nuevo proveedor…</option>
            </Select>
            {fieldErrors.supplierId && (
              <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.supplierId[0]}</p>
            )}
          </div>
        )}

        {!isEdit && form.stock !== "0" && form.supplierSelect === NEW_SUPPLIER_VALUE && (
          <div className="space-y-1.5">
            <Label htmlFor="supplierName">Nombre del nuevo proveedor</Label>
            <Input
              id="supplierName"
              value={form.supplierName}
              onChange={(e) => update("supplierName", e.target.value)}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="minimumStock">Stock mínimo</Label>
          <Input
            id="minimumStock"
            type="number"
            min={0}
            step={1}
            value={form.minimumStock}
            onChange={(e) => update("minimumStock", e.target.value)}
          />
          {fieldErrors.minimumStock && (
            <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.minimumStock[0]}</p>
          )}
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="image">Imagen</Label>
          <Input id="image" type="file" accept="image/*" onChange={handleImageChange} />
          {imageError && <p className="text-sm text-red-600 dark:text-red-400">{imageError}</p>}
          {form.image && (
            <div className="flex items-center gap-3 pt-1">
              <img src={form.image} alt="Vista previa" className="h-16 w-16 rounded object-cover" />
              <Button type="button" variant="outline" size="sm" onClick={() => update("image", "")}>
                Quitar imagen
              </Button>
            </div>
          )}
        </div>

        {isEdit && (
          <div className="col-span-2 flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={form.active}
              onChange={(e) => update("active", e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="active">Producto activo</Label>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear producto"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate("/products")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
