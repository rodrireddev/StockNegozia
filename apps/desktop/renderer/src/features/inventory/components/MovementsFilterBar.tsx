import type { ProductDto } from "@stocknegozia/api-contracts";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { MOVEMENT_TYPE_LABELS } from "@stocknegozia/shared";

export interface MovementsFiltersState {
  type: string;
  direction: string;
}

interface MovementsFilterBarProps {
  filters: MovementsFiltersState;
  onChange: (patch: Partial<MovementsFiltersState>) => void;
  filteredProduct: ProductDto | null;
  onClearProduct: () => void;
}

export function MovementsFilterBar({
  filters,
  onChange,
  filteredProduct,
  onClearProduct,
}: MovementsFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filteredProduct && (
        <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Producto: {filteredProduct.name}
          <button
            type="button"
            onClick={onClearProduct}
            aria-label="Quitar filtro de producto"
            className="ml-1 hover:opacity-70"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}

      <Select
        value={filters.type}
        onChange={(event) => onChange({ type: event.target.value })}
        className="w-auto"
      >
        <option value="">Todos los tipos</option>
        {Object.entries(MOVEMENT_TYPE_LABELS).map(([type, label]) => (
          <option key={type} value={type}>
            {label}
          </option>
        ))}
      </Select>

      <Select
        value={filters.direction}
        onChange={(event) => onChange({ direction: event.target.value })}
        className="w-auto"
      >
        <option value="">Entradas y salidas</option>
        <option value="IN">Solo entradas</option>
        <option value="OUT">Solo salidas</option>
      </Select>

      {(filters.type || filters.direction || filteredProduct) && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onChange({ type: "", direction: "" });
            onClearProduct();
          }}
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
