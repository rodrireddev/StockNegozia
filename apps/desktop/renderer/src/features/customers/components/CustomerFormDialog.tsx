import type { CustomerDto } from "@stocknegozia/api-contracts";
import { createCustomerSchema } from "@stocknegozia/validation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getUserFriendlyError } from "@/lib/errors";
import { useSaveCustomer } from "../hooks/useCustomers";

const EMPTY = { name: "", phone: "", email: "", documentNumber: "", notes: "" };
type Fields = typeof EMPTY;

interface CustomerFormDialogProps {
  /** `"new"` para alta, un cliente para editarlo, `null` cerrado. */
  customer: CustomerDto | "new" | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: (customer: CustomerDto) => void;
}

export function CustomerFormDialog({ customer, onOpenChange, onSaved }: CustomerFormDialogProps) {
  const editing = customer !== null && customer !== "new" ? customer : null;
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const save = useSaveCustomer(editing?.id ?? null);

  useEffect(() => {
    if (customer === null) return;
    setFields(
      editing
        ? {
            name: editing.name,
            phone: editing.phone ?? "",
            email: editing.email ?? "",
            documentNumber: editing.documentNumber ?? "",
            notes: editing.notes ?? "",
          }
        : EMPTY,
    );
    setFieldErrors({});
    setFormError(null);
  }, [customer, editing]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const result = createCustomerSchema.safeParse(fields);
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    setFieldErrors({});
    save.mutate(result.data, {
      onSuccess: (saved) => {
        onSaved?.(saved);
        onOpenChange(false);
      },
      onError: (error) => setFormError(getUserFriendlyError(error)),
    });
  }

  function field(key: keyof Fields, label: string, props: React.ComponentProps<typeof Input> = {}) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`customer-${key}`}>{label}</Label>
        <Input
          id={`customer-${key}`}
          value={fields[key]}
          onChange={(event) => setFields((prev) => ({ ...prev, [key]: event.target.value }))}
          {...props}
        />
        {fieldErrors[key] && <p className="text-sm text-destructive">{fieldErrors[key][0]}</p>}
      </div>
    );
  }

  return (
    <Dialog open={customer !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          </DialogHeader>
          {field("name", "Nombre", { autoFocus: true })}
          <div className="grid grid-cols-2 gap-3">
            {field("phone", "Teléfono (opcional)")}
            {field("documentNumber", "DNI / CUIT (opcional)")}
          </div>
          {field("email", "Email (opcional)", { type: "email" })}
          <div className="space-y-1.5">
            <Label htmlFor="customer-notes">Notas (opcional)</Label>
            <Textarea
              id="customer-notes"
              value={fields.notes}
              onChange={(event) => setFields((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
