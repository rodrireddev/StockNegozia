import type { SupplierDto } from "@stocknegozia/api-contracts";
import { updateSupplierSchema } from "@stocknegozia/validation";
import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { getUserFriendlyError } from "@/lib/errors";
import { useUpdateSupplier } from "../hooks/useUpdateSupplier";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "short" });

/**
 * Editar acá nunca reescribe compras ya creadas — cada una conserva su propio snapshot del
 * nombre del proveedor al momento de la compra (ver docs/inventory/PURCHASES.md).
 */
export function SupplierRow({ supplier }: { supplier: SupplierDto }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(supplier.name);
  const [phone, setPhone] = useState(supplier.phone ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const updateSupplier = useUpdateSupplier(supplier.id);

  function startEditing() {
    setName(supplier.name);
    setPhone(supplier.phone ?? "");
    setFieldErrors({});
    setFormError(null);
    setIsEditing(true);
  }

  function handleSave() {
    setFormError(null);
    const result = updateSupplierSchema.safeParse({ name, phone });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    setFieldErrors({});

    updateSupplier.mutate(result.data, {
      onSuccess: () => setIsEditing(false),
      onError: (error) => setFormError(getUserFriendlyError(error)),
    });
  }

  if (isEditing) {
    return (
      <TableRow>
        <TableCell>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          {fieldErrors.name && (
            <p className="mt-1 text-sm text-destructive">{fieldErrors.name[0]}</p>
          )}
        </TableCell>
        <TableCell>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" />
          {fieldErrors.phone && (
            <p className="mt-1 text-sm text-destructive">{fieldErrors.phone[0]}</p>
          )}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {dateFormatter.format(new Date(supplier.createdAt))}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave} disabled={updateSupplier.isPending}>
              {updateSupplier.isPending ? "Guardando…" : "Guardar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={updateSupplier.isPending}
            >
              Cancelar
            </Button>
          </div>
          {formError && <p className="mt-1 text-sm text-destructive">{formError}</p>}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{supplier.name}</TableCell>
      <TableCell className="text-muted-foreground">{supplier.phone ?? "—"}</TableCell>
      <TableCell className="text-muted-foreground">
        {dateFormatter.format(new Date(supplier.createdAt))}
      </TableCell>
      <TableCell>
        <Button size="sm" variant="ghost" onClick={startEditing}>
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Editar {supplier.name}</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}
