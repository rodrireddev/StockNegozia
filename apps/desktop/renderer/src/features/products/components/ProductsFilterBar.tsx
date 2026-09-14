import type { CategoryDto } from "@stocknegozia/api-contracts";
import type { ProductQueryInput } from "@stocknegozia/validation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export interface ProductFiltersState {
  search: string;
  categoryId: number | undefined;
  status: ProductQueryInput["status"];
  stockStatus: ProductQueryInput["stockStatus"];
  sortBy: ProductQueryInput["sortBy"];
  sortDir: ProductQueryInput["sortDir"];
}

interface ProductsFilterBarProps {
  filters: ProductFiltersState;
  onChange: (patch: Partial<ProductFiltersState>) => void;
  categories: CategoryDto[];
}

export function ProductsFilterBar({ filters, onChange, categories }: ProductsFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar por nombre, SKU o código de barras…"
        value={filters.search}
        onChange={(event) => onChange({ search: event.target.value })}
        className="max-w-xs"
      />

      <Select
        value={filters.categoryId ?? ""}
        onChange={(event) =>
          onChange({ categoryId: event.target.value ? Number(event.target.value) : undefined })
        }
        className="w-auto"
      >
        <option value="">Todas las categorías</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>

      <Select
        value={filters.status}
        onChange={(event) =>
          onChange({ status: event.target.value as ProductFiltersState["status"] })
        }
        className="w-auto"
      >
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
        <option value="all">Todos los estados</option>
      </Select>

      <Select
        value={filters.stockStatus}
        onChange={(event) =>
          onChange({ stockStatus: event.target.value as ProductFiltersState["stockStatus"] })
        }
        className="w-auto"
      >
        <option value="all">Cualquier stock</option>
        <option value="normal">Stock normal</option>
        <option value="low">Stock bajo</option>
        <option value="out">Sin stock</option>
      </Select>

      <Select
        value={`${filters.sortBy}:${filters.sortDir}`}
        onChange={(event) => {
          const [sortBy, sortDir] = event.target.value.split(":") as [
            ProductFiltersState["sortBy"],
            ProductFiltersState["sortDir"],
          ];
          onChange({ sortBy, sortDir });
        }}
        className="w-auto"
      >
        <option value="name:asc">Nombre (A-Z)</option>
        <option value="name:desc">Nombre (Z-A)</option>
        <option value="salePrice:asc">Precio (menor a mayor)</option>
        <option value="salePrice:desc">Precio (mayor a menor)</option>
        <option value="stock:asc">Stock (menor a mayor)</option>
        <option value="stock:desc">Stock (mayor a menor)</option>
      </Select>
    </div>
  );
}
