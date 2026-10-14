import type { ProductDto } from "@stocknegozia/api-contracts";
import {
  createPaymentDraft,
  isRapidKeystrokeBurst,
  resolveScanMatch,
  summarizePaymentDraft,
  type PaymentDraft,
} from "@stocknegozia/shared";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchProducts } from "@/features/products/api/products.api";
import { useDebouncedValue } from "@/features/products/hooks/useDebouncedValue";
import { useProducts } from "@/features/products/hooks/useProducts";
import { Input } from "@/components/ui/input";
import { getUserFriendlyError } from "@/lib/errors";
import { useMe } from "@/features/devices/hooks/useMe";
import { usePaymentTerms } from "@/features/settings/hooks/usePaymentTerms";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { MissingBusinessNameModal } from "../components/MissingBusinessNameModal";
import { MissingSellerNameModal } from "../components/MissingSellerNameModal";
import { SaleCartPanel } from "../components/SaleCartPanel";
import { SaleSearchResults } from "../components/SaleSearchResults";
import { useCart } from "../hooks/useCart";
import { useCreateSale } from "../hooks/useCreateSale";
import { useDownloadReceipt } from "../hooks/useDownloadReceipt";

// Umbral de intervalo entre teclas para considerar que el buscador está recibiendo un escaneo
// (ver isRapidKeystrokeBurst) y cuánto se espera de silencio tras la última tecla antes de
// resolver ese código automáticamente, sin esperar un Enter que el lector puede no mandar.
const SCAN_MAX_KEY_INTERVAL_MS = 40;
const SCAN_QUIET_PERIOD_MS = 150;

function isEditableElement(element: Element | null): boolean {
  if (!element) return false;
  if (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT"
  ) {
    return true;
  }
  return (element as HTMLElement).isContentEditable === true;
}

export function SalesPage() {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const keystrokeTimestampsRef = useRef<number[]>([]);
  const scanQuietTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Buffer aparte para cuando el escaneo empieza con el foco en otro lado (ej. el botón
  // "Confirmar venta" o el checkbox de recibo) — ver el efecto de más abajo que escucha en toda
  // la ventana. Una vez que se confirma que es un escaneo, se traspasa al buscador y estos refs
  // se vacían: a partir de ahí el flujo normal de arriba (keystrokeTimestampsRef/scanQuietTimerRef)
  // se hace cargo, como si el lector siempre hubiera tipeado ahí.
  const globalScanBufferRef = useRef("");
  const globalScanTimestampsRef = useRef<number[]>([]);
  const globalScanResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showMissingSellerModal, setShowMissingSellerModal] = useState(false);
  const [showMissingBusinessNameModal, setShowMissingBusinessNameModal] = useState(false);
  const [generateReceipt, setGenerateReceipt] = useState(false);
  const [receiptNotice, setReceiptNotice] = useState<string | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>(() => createPaymentDraft());

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
  const paymentTerms = usePaymentTerms();
  const paymentSummary = useMemo(
    () => summarizePaymentDraft(paymentDraft, cart.total, paymentTerms.data),
    [paymentDraft, cart.total, paymentTerms.data],
  );
  const downloadReceipt = useDownloadReceipt();
  const me = useMe();
  const settings = useSettings();

  // El buscador siempre debe estar listo para recibir un escaneo — sin que el usuario tenga que
  // clickearlo primero (ver M10 §8, lectores de código de barras).
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (scanQuietTimerRef.current) clearTimeout(scanQuietTimerRef.current);
    };
  }, []);

  function focusSearch() {
    searchInputRef.current?.focus();
  }

  function cancelPendingScan() {
    if (scanQuietTimerRef.current) {
      clearTimeout(scanQuietTimerRef.current);
      scanQuietTimerRef.current = null;
    }
    keystrokeTimestampsRef.current = [];
  }

  function handleAdd(product: ProductDto) {
    cancelPendingScan();
    cart.addItem(product);
    setSearchTerm("");
    setScanError(null);
    setSuccessMessage(null);
    setReceiptNotice(null);
    focusSearch();
  }

  async function resolveAndAdd(rawValue: string) {
    const raw = rawValue.trim();
    if (!raw) return;

    setScanError(null);

    // Camino rápido: la búsqueda ya cargada (aunque el debounce todavía no haya "alcanzado" al
    // último caracter tipeado/escaneado) puede alcanzar para resolver sin ida y vuelta a red.
    const currentMatch = resolveScanMatch(results ?? [], raw);
    if (currentMatch) {
      handleAdd(currentMatch);
      return;
    }

    // Un lector de código de barras tipea (y a veces manda Enter) más rápido que el debounce de
    // 300ms — se hace una consulta directa con el texto exacto para no perder el escaneo.
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

  // `resolveAndAdd` se recrea en cada render (cierra sobre `results`, que cambia con cada
  // búsqueda) — el listener global de abajo se registra una sola vez al montar, así que necesita
  // esta referencia siempre actualizada para no quedarse con una versión vieja de `results`.
  const resolveAndAddRef = useRef(resolveAndAdd);
  useEffect(() => {
    resolveAndAddRef.current = resolveAndAdd;
  });

  // Un lector de código de barras no respeta el foco: si al escanear el cursor quedó en otro
  // lado de la pantalla de Ventas (el botón "Confirmar venta", un checkbox, el cuerpo de la
  // página), los caracteres tipeados no llegan al buscador y el escaneo se pierde. Este listener
  // escucha en toda la ventana mientras Ventas está montada y, si detecta la misma ráfaga rápida
  // de teclas que arriba (ver isRapidKeystrokeBurst), la redirige al buscador — como si el lector
  // lo hubiera tenido enfocado desde el principio.
  useEffect(() => {
    function resetGlobalScanBuffer() {
      globalScanBufferRef.current = "";
      globalScanTimestampsRef.current = [];
      if (globalScanResetTimerRef.current) {
        clearTimeout(globalScanResetTimerRef.current);
        globalScanResetTimerRef.current = null;
      }
    }

    function handleWindowKeyDown(event: globalThis.KeyboardEvent) {
      const active = document.activeElement;
      // El buscador ya resuelve sus propios escaneos vía onChange/onKeyDown (ver arriba).
      if (active === searchInputRef.current) return;
      // Foco en otro campo editable (ej. el modal de "vendedor actual"): se asume que la persona
      // está tipeando ahí a propósito, no se interfiere.
      if (isEditableElement(active)) return;

      if (event.key === "Enter") {
        if (!globalScanBufferRef.current) return; // Enter "normal" sobre el botón/checkbox enfocado
        event.preventDefault();
        const value = globalScanBufferRef.current;
        resetGlobalScanBuffer();
        searchInputRef.current?.focus();
        setSearchTerm(value);
        void resolveAndAddRef.current(value);
        return;
      }

      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (!/^[a-zA-Z0-9]$/.test(event.key)) return;

      // El caracter no tiene ninguna acción por defecto relevante en un elemento no editable
      // (botón, checkbox, body) — se lo intercepta para evaluarlo como posible escaneo.
      event.preventDefault();
      if (globalScanResetTimerRef.current) clearTimeout(globalScanResetTimerRef.current);

      globalScanBufferRef.current += event.key;
      globalScanTimestampsRef.current.push(Date.now());

      if (isRapidKeystrokeBurst(globalScanTimestampsRef.current, SCAN_MAX_KEY_INTERVAL_MS)) {
        const value = globalScanBufferRef.current;
        const timestamps = [...globalScanTimestampsRef.current];
        resetGlobalScanBuffer();

        searchInputRef.current?.focus();
        setSearchTerm(value);
        keystrokeTimestampsRef.current = timestamps;
        if (scanQuietTimerRef.current) clearTimeout(scanQuietTimerRef.current);
        scanQuietTimerRef.current = setTimeout(() => {
          void resolveAndAddRef.current(value);
        }, SCAN_QUIET_PERIOD_MS);
      } else if (globalScanTimestampsRef.current.length === 1) {
        // Todavía no hay con qué comparar velocidad — se espera un segundo caracter rápido antes
        // de descartarlo.
        globalScanResetTimerRef.current = setTimeout(resetGlobalScanBuffer, SCAN_QUIET_PERIOD_MS);
      } else {
        // Ya se comprobó que no es lo bastante rápido para ser un escaneo — se descarta sin
        // efecto (la tecla no hacía nada de todos modos en el elemento enfocado).
        resetGlobalScanBuffer();
      }
    }

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
      resetGlobalScanBuffer();
    };
  }, []);

  // Confirmación manual: tipear (o escanear con un lector que sí manda Enter) y apretar Enter
  // resuelve al instante, sin esperar el período de silencio de abajo.
  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    cancelPendingScan();
    void resolveAndAdd(searchTerm);
  }

  // No todos los lectores mandan Enter al terminar de leer un código — algunos vienen
  // configurados para tipear solo los dígitos. Sin este camino, ese escaneo se quedaba tipeado en
  // el buscador sin agregarse nunca al carrito. Se detecta un escaneo por velocidad de tecleo
  // (ver isRapidKeystrokeBurst) y, si se sostiene, se resuelve solo tras un breve silencio —
  // igual de rápido para quien escanea, sin depender del lector.
  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    setSearchTerm(value);
    setScanError(null);

    if (scanQuietTimerRef.current) clearTimeout(scanQuietTimerRef.current);

    const previousLength = keystrokeTimestampsRef.current.length;
    // Un cambio que no es "agregar un caracter al final" (borrar, pegar, seleccionar y
    // reemplazar) no es un escaneo en curso — se arranca una serie nueva.
    if (!value || value.length !== previousLength + 1) {
      keystrokeTimestampsRef.current = value ? [Date.now()] : [];
    } else {
      keystrokeTimestampsRef.current.push(Date.now());
    }

    if (isRapidKeystrokeBurst(keystrokeTimestampsRef.current, SCAN_MAX_KEY_INTERVAL_MS)) {
      scanQuietTimerRef.current = setTimeout(() => {
        void resolveAndAdd(value);
      }, SCAN_QUIET_PERIOD_MS);
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

    // Generar el recibo con el nombre genérico de fallback del backend ("StockNegozia", ver
    // sale-receipt.pdf.ts) es un error que antes recién se notaba mirando el PDF ya entregado —
    // se corta acá, antes de registrar la venta, en vez de dejarlo pasar.
    if (generateReceipt && !settings.data?.businessName) {
      setShowMissingBusinessNameModal(true);
      return;
    }

    if (!paymentSummary.payments) {
      setConfirmError(paymentSummary.error ?? "Revisá la forma de pago.");
      return;
    }

    let sale;
    try {
      sale = await createSale.mutateAsync({
        items: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        payments: paymentSummary.payments,
      });
      // El carrito solo se limpia después de que el backend confirmó la venta — nunca antes.
      cart.clear();
      // La próxima venta arranca con el mismo medio (lo más común es cobrar igual varias veces
      // seguidas), pero sin montos ni referencias de esta.
      setPaymentDraft((draft) => createPaymentDraft(draft.lines[0]?.method));
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
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
        />
        {scanError && <p className="mt-1 text-sm text-destructive">{scanError}</p>}
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
          paymentDraft={paymentDraft}
          onPaymentDraftChange={setPaymentDraft}
          paymentSummary={paymentSummary}
          paymentTerms={paymentTerms.data}
        />
      </div>

      <MissingSellerNameModal
        open={showMissingSellerModal}
        onOpenChange={setShowMissingSellerModal}
      />
      <MissingBusinessNameModal
        open={showMissingBusinessNameModal}
        onOpenChange={setShowMissingBusinessNameModal}
      />
    </div>
  );
}
