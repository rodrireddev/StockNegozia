import { createSupplierSchema } from "@stocknegozia/validation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUserFriendlyError } from "@/lib/errors";
import { useCreateSupplier } from "../hooks/useCreateSupplier";

export function SupplierForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const createSupplier = useCreateSupplier();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = createSupplierSchema.safeParse({ name, phone });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    setFieldErrors({});

    createSupplier.mutate(result.data, {
      onSuccess: () => {
        setName("");
        setPhone("");
      },
      onError: (error) => setFormError(getUserFriendlyError(error)),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="supplier-name">Nuevo proveedor</Label>
          <Input
            id="supplier-name"
            placeholder="Nombre del proveedor"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {fieldErrors.name && (
            <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.name[0]}</p>
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="supplier-phone">Teléfono (opcional)</Label>
          <Input
            id="supplier-phone"
            placeholder="Teléfono"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          {fieldErrors.phone && (
            <p className="text-sm text-red-600 dark:text-red-400">{fieldErrors.phone[0]}</p>
          )}
        </div>
        <Button type="submit" disabled={createSupplier.isPending}>
          {createSupplier.isPending ? "Guardando…" : "Agregar"}
        </Button>
      </div>
      {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
    </form>
  );
}
