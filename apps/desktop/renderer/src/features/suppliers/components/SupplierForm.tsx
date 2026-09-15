import { createSupplierSchema } from "@stocknegozia/validation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUserFriendlyError } from "@/lib/errors";
import { useCreateSupplier } from "../hooks/useCreateSupplier";

export function SupplierForm() {
  const [name, setName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const createSupplier = useCreateSupplier();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = createSupplierSchema.safeParse({ name });
    if (!result.success) {
      setFieldError(result.error.flatten().fieldErrors.name?.[0] ?? "Nombre inválido");
      return;
    }
    setFieldError(null);

    createSupplier.mutate(result.data, {
      onSuccess: () => setName(""),
      onError: (error) => setFormError(getUserFriendlyError(error)),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="supplier-name">Nuevo proveedor</Label>
        <Input
          id="supplier-name"
          placeholder="Nombre del proveedor"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {fieldError && <p className="text-sm text-red-600 dark:text-red-400">{fieldError}</p>}
        {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
      </div>
      <Button type="submit" disabled={createSupplier.isPending}>
        {createSupplier.isPending ? "Guardando…" : "Agregar"}
      </Button>
    </form>
  );
}
