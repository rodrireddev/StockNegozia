import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useCustomers } from "../hooks/useCustomers";
import { CustomerFormDialog } from "./CustomerFormDialog";

interface CustomerPickerProps {
  value: number | null;
  onChange: (customerId: number | null) => void;
  disabled?: boolean;
}

/** Cliente opcional de la venta — vacío = venta de mostrador. */
export function CustomerPicker({ value, onChange, disabled }: CustomerPickerProps) {
  const { data: customers = [] } = useCustomers();
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label="Cliente"
        className="w-56"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        disabled={disabled}
      >
        <option value="">Sin cliente (mostrador)</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}
          </option>
        ))}
      </Select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setCreating(true)}
        disabled={disabled}
      >
        <UserPlus className="h-4 w-4" />
        <span className="sr-only">Nuevo cliente</span>
      </Button>
      <CustomerFormDialog
        customer={creating ? "new" : null}
        onOpenChange={setCreating}
        onSaved={(customer) => onChange(customer.id)}
      />
    </div>
  );
}
