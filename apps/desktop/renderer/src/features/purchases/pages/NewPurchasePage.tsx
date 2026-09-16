import type { ProductDto } from "@stocknegozia/api-contracts";
import { resolveScanMatch } from "@stocknegozia/shared";
import { createPurchaseSchema } from "@stocknegozia/validation";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { fetchProducts } from "@/features/products/api/products.api";
import { useDebouncedValue } from "@/features/products/hooks/useDebouncedValue";
import { useProducts } from "@/features/products/hooks/useProducts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getUserFriendlyError } from "@/lib/errors";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { PurchaseCartPanel } from "../components/PurchaseCartPanel";
import { PurchaseSearchResults } from "../components/PurchaseSearchResults";
import { useCreatePurchase } from "../hooks/useCreatePurchase";
import { usePurchaseCart } from "../hooks/usePurchaseCart";

const SUPPLIER_REQUIRED_MESSAGE = "Seleccioná un proveedor antes de confirmar la compra.";

export function NewPurchasePage() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [supplierId, setSupplierId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(searchTerm);
  const trimmedDebouncedSearch = debouncedSearch.trim();

  const { data: suppliers } = useSuppliers();
  const {
    data: results,
    isLoading,
    isError,
    refetch,
  } = useProducts({ search: trimmedDebouncedSearch || undefined });

  const cart = usePurchaseCart();
  const createPurchase = useCreatePurchase();

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  function focusSearch() {
    searchInputRef.current?.focus();
  }

  function handleAdd(product: ProductDto) {
    cart.addItem(product);
    setSearchTerm("");
    setScanError(null);
    setSuccessMessage(null);
    focusSearch();
  }

  async function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    const raw = searchTerm.trim();
    if (!raw) return;

    setScanError(null);

    const currentMatch = resolveScanMatch(results ?? [], raw);
    if (currentMatch) {
      handleAdd(currentMatch);
      return;
    }

    setIsResolvingScan(true);
    try {
      const fresh = await fetchProducts({ search: raw });
      const match = resolveScanMatch(fresh, raw);
      if (match) {
        handleAdd(match);
      } else {
        setScanError(`No encontramos ningún producto para "${raw}".`);
      }
    } catch (error) {
      setScanError(getUserFriendlyError(error));
    } finally {
      setIsResolvingScan(false);
    }
  }

  async function handleConfirm() {
    if (cart.isEmpty || createPurchase.isPending) return;

    setConfirmError(null);
    setSuccessMessage(null);

    if (!supplierId) {
      setConfirmError(SUPPLIER_REQUIRED_MESSAGE);
      return;
    }

    const payload = {
      supplierId,
      items: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
      })),
    };

    const validation = createPurchaseSchema.safeParse(payload);
    if (!validation.success) {
      setConfirmError(validation.error.issues[0]?.message ?? "Revisá los datos de la compra.");
      return;
    }

    try {
      await createPurchase.mutateAsync(validation.data);
      // El carrito y el proveedor solo se limpian después de que el backend confirmó la compra.
      cart.clear();
      setSupplierId("");
      setSuccessMessage("Compra registrada correctamente.");
      focusSearch();
    } catch (error) {
      setConfirmError(getUserFriendlyError(error));
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="text-xl font-semibold">Compras</h1>

      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="purchase-supplier">Proveedor</Label>
        <Select
          id="purchase-supplier"
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
        >
          <option value="">Seleccionar proveedor</option>
          {(suppliers ?? []).map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Input
          ref={searchInputRef}
          autoFocus
          placeholder="Buscar por nombre, SKU o escanear código de barras…"
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setScanError(null);
          }}
          onKeyDown={handleSearchKeyDown}
        />
        {scanError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{scanError}</p>}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_360px]">
        <PurchaseSearchResults
          products={results ?? []}
          isLoading={isLoading || isResolvingScan}
          isError={isError}
          hasQuery={trimmedDebouncedSearch.length > 0}
          onRetry={() => refetch()}
          onSelect={handleAdd}
        />
        <PurchaseCartPanel
          items={cart.items}
          total={cart.total}
          onSetQuantity={cart.setQuantity}
          onSetUnitCost={cart.setUnitCost}
          onRemove={cart.removeItem}
          onConfirm={handleConfirm}
          isSubmitting={createPurchase.isPending}
          errorMessage={confirmError}
          successMessage={successMessage}
        />
      </div>
    </div>
  );
}
