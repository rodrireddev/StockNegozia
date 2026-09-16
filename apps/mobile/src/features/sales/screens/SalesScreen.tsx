import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ShoppingCart } from "lucide-react-native";
import type { ProductDto } from "@stocknegozia/api-contracts";
import { resolveScanMatch } from "@stocknegozia/shared";
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
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { SaleCartRow } from "../components/SaleCartRow";
import { useCart } from "../hooks/useCart";
import { useCreateSale } from "../hooks/useCreateSale";

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export function SalesScreen() {
  const { colors } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(searchTerm);
  const trimmedSearch = debouncedSearch.trim();

  const productsQuery = useProducts({ search: trimmedSearch || undefined });
  useAuthErrorRedirect(productsQuery.error);

  const cart = useCart();
  const createSale = useCreateSale();
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

    try {
      await createSale.mutateAsync({
        items: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      });
      // El carrito solo se limpia después de que el backend confirmó la venta — nunca antes.
      cart.clear();
      setSuccessMessage("Venta registrada correctamente.");
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : "No se pudo registrar la venta.");
    }
  }

  return (
    <ScreenContainer>
      <Text style={[typography.title, { color: colors.foreground, marginBottom: spacing.md }]}>
        Ventas
      </Text>

      <TextField
        label="Buscar producto"
        placeholder="Nombre, SKU o código de barras…"
        value={searchTerm}
        onChangeText={(v) => {
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
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
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
              {trimmedSearch
                ? `No encontramos productos que coincidan con "${trimmedSearch}".`
                : "No tenés productos cargados todavía."}
            </Text>
          ) : (
            (productsQuery.data ?? []).map((product) => (
              <Pressable key={product.id} onPress={() => handleAdd(product)}>
                <ProductListItem product={product} />
              </Pressable>
            ))
          )}
        </View>

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
        {confirmError && <Text style={{ color: colors.danger }}>{confirmError}</Text>}
        {successMessage && <Text style={{ color: colors.success }}>{successMessage}</Text>}
        <View style={styles.totalRow}>
          <Text style={[typography.bodyStrong, { color: colors.foreground }]}>Total</Text>
          <Text style={[typography.title, { color: colors.foreground }]}>
            {currencyFormatter.format(cart.total)}
          </Text>
        </View>
        <Button
          testID="confirm-sale"
          label={createSale.isPending ? "Registrando venta…" : "Confirmar venta"}
          onPress={handleConfirm}
          disabled={cart.isEmpty}
          loading={createSale.isPending}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md },
  results: { gap: spacing.sm },
  cartList: { gap: spacing.sm },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, gap: spacing.sm },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
