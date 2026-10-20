import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ShoppingCart } from "lucide-react-native";
import type { ProductDto } from "@stocknegozia/api-contracts";
import {
  formatMoney,
  resolveScanMatch,
  createPaymentDraft,
  summarizePaymentDraft,
  type PaymentDraft,
} from "@stocknegozia/shared";
import { fetchProductByCode, fetchProducts } from "@/api/endpoints/products";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { TextField } from "@/components/TextField";
import { useAuthErrorRedirect } from "@/auth/useAuthErrorRedirect";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProducts } from "@/features/products/hooks/useProducts";
import { ProductListItem } from "@/features/products/components/ProductListItem";
import { ProductScanner, type ScanFeedback } from "@/features/scanner/ProductScanner";
import { productAddedFeedback, scanErrorFeedback } from "@/features/scanner/scanFeedback";
import type { ScanResult } from "@/features/scanner/types";
import { useScanBeep } from "@/features/scanner/useScanBeep";
import { useSettings } from "@/features/settings/hooks/useSettings";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { MissingBusinessNameModal } from "../components/MissingBusinessNameModal";
import { usePaymentTerms } from "@/features/finance/hooks/usePaymentTerms";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { CheckoutSheet } from "../components/CheckoutSheet";
import { SaleCartRow } from "../components/SaleCartRow";
import { useCart } from "../hooks/useCart";
import { useCreateSale } from "../hooks/useCreateSale";
import { useDownloadReceipt } from "../hooks/useDownloadReceipt";

export function SalesScreen() {
  const { colors } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generateReceipt, setGenerateReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [showMissingBusinessNameModal, setShowMissingBusinessNameModal] = useState(false);

  const debouncedSearch = useDebouncedValue(searchTerm);
  const trimmedSearch = debouncedSearch.trim();

  const productsQuery = useProducts({ search: trimmedSearch || undefined });
  useAuthErrorRedirect(productsQuery.error);

  const cart = useCart();
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>(() => createPaymentDraft());
  const paymentTerms = usePaymentTerms();
  const paymentSummary = useMemo(
    () => summarizePaymentDraft(paymentDraft, cart.total, paymentTerms.data),
    [paymentDraft, cart.total, paymentTerms.data],
  );
  // Paso "Cobrar" en pantalla completa — ver `CheckoutSheet`.
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const customers = useCustomers();
  const createSale = useCreateSale();
  const downloadReceipt = useDownloadReceipt();
  const settings = useSettings();
  const playScanBeep = useScanBeep();

  function handleAdd(product: ProductDto) {
    cart.addItem(product);
    setSearchTerm("");
    setScanError(null);
    setSuccessMessage(null);
  }

  async function handleSubmitSearch() {
    const raw = searchTerm.trim();
    if (!raw) return;
    setScanError(null);

    const currentMatch = resolveScanMatch(productsQuery.data ?? [], raw);
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
      setScanError(error instanceof Error ? error.message : "No se pudo buscar el producto.");
    } finally {
      setIsResolvingScan(false);
    }
  }

  /**
   * A diferencia de `handleSubmitSearch`, acá el scanner se queda abierto: la persona puede
   * escanear varios productos seguidos sin volver a tocar "Escanear" cada vez. El resultado
   * (agregado o error) se avisa con un beep + el banner animado de `ProductScanner` — el mensaje
   * inline (`scanError`) queda tapado por el modal de la cámara mientras está abierto, así que no
   * sirve acá. Cada llamada crea un objeto `ScanFeedback` nuevo (aunque el texto se repita), que es
   * justamente lo que `ProductScanner` necesita para re-animar el aviso en cada escaneo.
   */
  async function handleScanDetected(result: ScanResult) {
    try {
      const product = await fetchProductByCode(result.code);
      cart.addItem(product);
      playScanBeep();
      setScanFeedback(productAddedFeedback(product.name));
    } catch (error) {
      setScanFeedback(
        scanErrorFeedback(
          error instanceof Error ? error.message : "No se pudo buscar el producto.",
        ),
      );
    }
  }

  async function handleConfirm() {
    if (cart.isEmpty || createSale.isPending) return;
    setConfirmError(null);
    setSuccessMessage(null);
    setReceiptError(null);

    // Generar el recibo con el nombre genérico de fallback del backend ("StockNegozia", ver
    // sale-receipt.pdf.ts) es un error que antes recién se notaba mirando el PDF ya entregado —
    // se corta acá, antes de registrar la venta, en vez de dejarlo pasar.
    if (generateReceipt && !settings.data?.businessName) {
      setCheckoutOpen(false);
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
        ...(customerId !== null && { customerId }),
      });
      // El carrito solo se limpia después de que el backend confirmó la venta — nunca antes.
      cart.clear();
      setCustomerId(null);
      setCheckoutOpen(false);
      // La próxima venta arranca con el mismo medio, sin montos ni referencias de esta.
      setPaymentDraft((draft) => createPaymentDraft(draft.lines[0]?.method));
      setSuccessMessage("Venta registrada correctamente.");
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : "No se pudo registrar la venta.");
      return;
    }

    // La descarga del recibo es una acción aparte y opcional: si falla, la venta ya quedó
    // confirmada — nunca se muestra como si la venta hubiera fallado.
    if (generateReceipt) {
      try {
        await downloadReceipt.mutateAsync(sale.id);
      } catch (error) {
        setReceiptError(error instanceof Error ? error.message : "No se pudo generar el recibo.");
      }
    }
  }

  return (
    // Raíz propia para que la capa "Cobrar" cubra toda la pantalla (incluido el padding
    // de `ScreenContainer`).
    <View style={styles.root}>
      <ScreenContainer>
        <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
          Ventas
        </Text>

        <TextField
          label="Buscar producto"
          placeholder="Nombre, SKU o código de barras…"
          value={searchTerm}
          onChangeText={(v) => {
            // Los resultados se muestran arriba del carrito: si el carrito estaba scrolleado hacia
            // abajo, quedaban fuera de la vista.
            scrollRef.current?.scrollTo({ y: 0, animated: false });
            setSearchTerm(v);
            setScanError(null);
          }}
          onSubmitEditing={handleSubmitSearch}
          returnKeyType="done"
        />
        <Button
          label="📷 Escanear"
          variant="secondary"
          onPress={() => setScannerOpen(true)}
          testID="scan-product-sale"
        />
        {scanError && <Text style={{ color: colors.danger }}>{scanError}</Text>}

        <ProductScanner
          visible={scannerOpen}
          onDetected={handleScanDetected}
          onCancel={() => setScannerOpen(false)}
          feedback={scanFeedback}
        />

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Resultados sólo mientras se busca: con el catálogo entero arriba, el carrito (y sus +/-)
              quedaba empujado fuera de la pantalla después de cada producto agregado. */}
          {searchTerm.trim() !== "" && trimmedSearch !== "" && (
            <View style={styles.results}>
              {productsQuery.isLoading || isResolvingScan ? (
                <LoadingState message="Buscando productos…" />
              ) : productsQuery.isError ? (
                <ErrorState
                  message="No pudimos cargar los productos."
                  onRetry={() => void productsQuery.refetch()}
                />
              ) : (productsQuery.data ?? []).length === 0 ? (
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  {`No encontramos productos que coincidan con "${trimmedSearch}".`}
                </Text>
              ) : (
                (productsQuery.data ?? []).map((product) => (
                  <Pressable key={product.id} onPress={() => handleAdd(product)}>
                    <ProductListItem product={product} />
                  </Pressable>
                ))
              )}
            </View>
          )}

          <Text style={[typography.subtitle, { color: colors.foreground }]}>Venta actual</Text>

          {cart.items.length === 0 ? (
            <EmptyState
              title="Carrito vacío"
              message="Buscá o escaneá un producto para empezar."
              icon={ShoppingCart}
            />
          ) : (
            <View style={styles.cartList}>
              {cart.items.map((item) => (
                <SaleCartRow
                  key={item.productId}
                  item={item}
                  onIncrement={() => cart.incrementItem(item.productId)}
                  onDecrement={() => cart.decrementItem(item.productId)}
                  onRemove={() => cart.removeItem(item.productId)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {confirmError && !checkoutOpen && (
            <Text style={{ color: colors.danger }}>{confirmError}</Text>
          )}
          {successMessage && <Text style={{ color: colors.success }}>{successMessage}</Text>}
          {receiptError && <Text style={{ color: colors.danger }}>{receiptError}</Text>}
          <View style={styles.totalRow}>
            <Text style={[typography.bodyStrong, { color: colors.foreground }]}>Total</Text>
            {/* `adjustsFontSizeToFit`: con totales de 9+ dígitos el título no entraba en el ancho
              del teléfono y se cortaba. */}
            <Text
              style={[typography.title, styles.totalAmount, { color: colors.foreground }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatMoney(cart.total)}
            </Text>
          </View>
          <Button
            testID="open-checkout"
            label={cart.isEmpty ? "Cobrar" : `Cobrar ${formatMoney(paymentSummary.totalToCharge)}`}
            onPress={() => {
              setConfirmError(null);
              setSuccessMessage(null);
              setCheckoutOpen(true);
            }}
            disabled={cart.isEmpty}
          />
        </View>

        <MissingBusinessNameModal
          visible={showMissingBusinessNameModal}
          onClose={() => setShowMissingBusinessNameModal(false)}
        />
      </ScreenContainer>
      <CheckoutSheet
        visible={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        total={cart.total}
        itemCount={cart.items.reduce((sum, item) => sum + item.quantity, 0)}
        draft={paymentDraft}
        onDraftChange={setPaymentDraft}
        summary={paymentSummary}
        terms={paymentTerms.data}
        generateReceipt={generateReceipt}
        onGenerateReceiptChange={setGenerateReceipt}
        onConfirm={handleConfirm}
        isSubmitting={createSale.isPending}
        error={confirmError}
        customers={customers.data}
        customerId={customerId}
        onCustomerChange={setCustomerId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md },
  results: { gap: spacing.sm },
  cartList: { gap: spacing.sm },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, gap: spacing.sm },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  totalAmount: { flexShrink: 1, textAlign: "right" },
});
