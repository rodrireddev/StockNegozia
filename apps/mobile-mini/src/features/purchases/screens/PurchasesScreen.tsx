import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ShoppingCart } from "lucide-react-native";
import type { ProductDto } from "@stocknegozia/api-contracts";
import { resolveScanMatch } from "@stocknegozia/shared";
import { fetchProductByCode, fetchProducts } from "@/data/products";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { ScreenContainer } from "@/components/ScreenContainer";
import { Select } from "@/components/Select";
import { TextField } from "@/components/TextField";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProducts } from "@/features/products/hooks/useProducts";
import { ProductListItem } from "@/features/products/components/ProductListItem";
import { ProductScanner, type ScanFeedback } from "@/features/scanner/ProductScanner";
import { productAddedFeedback, scanErrorFeedback } from "@/features/scanner/scanFeedback";
import type { ScanResult } from "@/features/scanner/types";
import { useScanBeep } from "@/features/scanner/useScanBeep";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { useTheme } from "@/theme/useTheme";
import { spacing, typography } from "@/theme/tokens";
import { PurchaseCartRow } from "../components/PurchaseCartRow";
import { useCreatePurchase } from "../hooks/useCreatePurchase";
import { usePurchaseCart } from "../hooks/usePurchaseCart";

const currencyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const SUPPLIER_REQUIRED_MESSAGE = "Seleccioná un proveedor antes de confirmar la compra.";

export function PurchasesScreen() {
  const { colors } = useTheme();
  const [supplierId, setSupplierId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [isResolvingScan, setIsResolvingScan] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(searchTerm);
  const trimmedSearch = debouncedSearch.trim();

  const suppliersQuery = useSuppliers();
  const suppliers = suppliersQuery.data ?? [];
  const productsQuery = useProducts({ search: trimmedSearch || undefined });

  const cart = usePurchaseCart();
  const createPurchase = useCreatePurchase();
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
    if (cart.isEmpty || createPurchase.isPending) return;
    setConfirmError(null);
    setSuccessMessage(null);

    if (!supplierId) {
      setConfirmError(SUPPLIER_REQUIRED_MESSAGE);
      return;
    }

    try {
      await createPurchase.mutateAsync({
        supplierId: Number(supplierId),
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      });
      cart.clear();
      setSupplierId("");
      setSuccessMessage("Compra registrada correctamente.");
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : "No se pudo registrar la compra.");
    }
  }

  return (
    <ScreenContainer>
      <Text style={[typography.title, styles.title, { color: colors.foreground }]}>Compras</Text>

      <Select
        label="Proveedor"
        value={supplierId}
        placeholder="Seleccionar proveedor"
        options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
        onChange={setSupplierId}
      />

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
        testID="scan-product-purchase"
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

        <Text style={[typography.subtitle, { color: colors.foreground }]}>Compra actual</Text>

        {cart.items.length === 0 ? (
          <EmptyState
            title="Carrito vacío"
            message="Buscá o escaneá un producto para empezar."
            icon={ShoppingCart}
          />
        ) : (
          <View style={styles.cartList}>
            {cart.items.map((item) => (
              <PurchaseCartRow
                key={item.productId}
                item={item}
                onSetQuantity={(quantity) => cart.setQuantity(item.productId, quantity)}
                onSetUnitCost={(unitCost) => cart.setUnitCost(item.productId, unitCost)}
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
          testID="confirm-purchase"
          label={createPurchase.isPending ? "Registrando compra…" : "Confirmar compra"}
          onPress={handleConfirm}
          disabled={cart.isEmpty}
          loading={createPurchase.isPending}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.sm },
  scroll: { flex: 1 },
  content: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md },
  results: { gap: spacing.sm },
  cartList: { gap: spacing.sm },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, gap: spacing.sm },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
