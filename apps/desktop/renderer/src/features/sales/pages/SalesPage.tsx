import type { ProductDto } from "@stocknegozia/api-contracts";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { fetchProducts } from "@/features/products/api/products.api";
import { useDebouncedValue } from "@/features/products/hooks/useDebouncedValue";
import { useProducts } from "@/features/products/hooks/useProducts";
import { Input } from "@/components/ui/input";
import { getUserFriendlyError } from "@/lib/errors";
import { SaleCartPanel } from "../components/SaleCartPanel";
import { SaleSearchResults } from "../components/SaleSearchResults";
import { useCart } from "../hooks/useCart";
import { useCreateSale } from "../hooks/useCreateSale";
import { resolveScanMatch } from "@/lib/resolve-scan-match";

export function SalesPage() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(searchTerm);
  const trimmedDebouncedSearch = debouncedSearch.trim();

  const {
    data: results,
    isLoading,
    isError,
    refetch,
  } = useProducts({ search: trimmedDebouncedSearch || undefined });

  const cart = useCart();
  const createSale = useCreateSale();

  // El buscador siempre debe estar listo para recibir un escaneo — sin que el usuario tenga que
  // clickearlo primero (ver M10 §8, lectores de código de barras).
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

    // Camino rápido: la búsqueda ya cargada (aunque el debounce todavía no haya "alcanzado" al
    // último caracter tipeado/escaneado) puede alcanzar para resolver sin ida y vuelta a red.
    const currentMatch = resolveScanMatch(results ?? [], raw);
    if (currentMatch) {
      handleAdd(currentMatch);
      return;
    }

    // Un lector de código de barras tipea y manda Enter más rápido que el debounce de 300ms —
    // se hace una consulta directa con el texto exacto para no perder el escaneo.
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
    if (cart.isEmpty || createSale.isPending) return;
    setConfirmError(null);
    setSuccessMessage(null);

    try {
      await createSale.mutateAsync({
        items: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      // El carrito solo se limpia después de que el backend confirmó la venta — nunca antes.
      cart.clear();
      setSuccessMessage("Venta registrada correctamente.");
      focusSearch();
    } catch (error) {
      setConfirmError(getUserFriendlyError(error));
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <h1 className="text-xl font-semibold">Nueva venta</h1>

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
        {scanError && <p className="mt-1 text-sm text-red-600">{scanError}</p>}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_360px]">
        <SaleSearchResults
          products={results ?? []}
          isLoading={isLoading || isResolvingScan}
          isError={isError}
          hasQuery={trimmedDebouncedSearch.length > 0}
          onRetry={() => refetch()}
          onSelect={handleAdd}
        />
        <SaleCartPanel
          items={cart.items}
          total={cart.total}
          onIncrement={cart.incrementItem}
          onDecrement={cart.decrementItem}
          onRemove={cart.removeItem}
          onConfirm={handleConfirm}
          isSubmitting={createSale.isPending}
          errorMessage={confirmError}
          successMessage={successMessage}
        />
      </div>
    </div>
  );
}
