import type { ProductDto } from "@stocknegozia/api-contracts";
import { resolveScanMatch } from "@stocknegozia/shared";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { fetchProducts } from "@/features/products/api/products.api";
import { useDebouncedValue } from "@/features/products/hooks/useDebouncedValue";
import { useProducts } from "@/features/products/hooks/useProducts";
import { Input } from "@/components/ui/input";
import { getUserFriendlyError } from "@/lib/errors";
import { useMe } from "@/features/devices/hooks/useMe";
import { MissingSellerNameModal } from "../components/MissingSellerNameModal";
import { SaleCartPanel } from "../components/SaleCartPanel";
import { SaleSearchResults } from "../components/SaleSearchResults";
import { useCart } from "../hooks/useCart";
import { useCreateSale } from "../hooks/useCreateSale";
import { useDownloadReceipt } from "../hooks/useDownloadReceipt";

export function SalesPage() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showMissingSellerModal, setShowMissingSellerModal] = useState(false);
  const [generateReceipt, setGenerateReceipt] = useState(false);
  const [receiptNotice, setReceiptNotice] = useState<string | null>(null);

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
  const downloadReceipt = useDownloadReceipt();
  const me = useMe();

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
    setReceiptNotice(null);
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
    setReceiptNotice(null);

    // No se puede registrar una venta sin vendedor actual configurado (ver
    // docs/inventory/STOCK_MOVEMENTS.md §Trazabilidad) — se corta acá, antes de llamar a la API,
    // y se resuelve con el mismo modal en vez de un simple mensaje de error.
    if (!me.data?.sellerName) {
      setShowMissingSellerModal(true);
      return;
    }

    let sale;
    try {
      sale = await createSale.mutateAsync({
        items: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      // El carrito solo se limpia después de que el backend confirmó la venta — nunca antes.
      cart.clear();
      setSuccessMessage("Venta registrada correctamente.");
      focusSearch();
    } catch (error) {
      setConfirmError(getUserFriendlyError(error));
      return;
    }

    // La descarga del recibo es una acción aparte y opcional: si falla, la venta ya quedó
    // confirmada — nunca se muestra como si la venta hubiera fallado.
    if (generateReceipt) {
      const outcome = await downloadReceipt.mutateAsync(sale.id);
      if (outcome.cancelled) {
        // El usuario canceló el diálogo de guardado — no hace falta ningún aviso.
      } else if ("error" in outcome) {
        setReceiptNotice(`No se pudo guardar el recibo: ${outcome.error}`);
      } else {
        setReceiptNotice(`Recibo guardado en ${outcome.filePath}`);
      }
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
        {scanError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{scanError}</p>}
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
          isSubmitting={createSale.isPending || downloadReceipt.isPending}
          errorMessage={confirmError}
          successMessage={successMessage}
          generateReceipt={generateReceipt}
          onGenerateReceiptChange={setGenerateReceipt}
          receiptNotice={receiptNotice}
        />
      </div>

      <MissingSellerNameModal open={showMissingSellerModal} onOpenChange={setShowMissingSellerModal} />
    </div>
  );
}
