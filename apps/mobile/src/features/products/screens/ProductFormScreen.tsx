import { useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { LoadingState } from "@/components/LoadingState";
import { useAuthErrorRedirect } from "@/auth/useAuthErrorRedirect";
import { ProductForm } from "../components/ProductForm";
import { useProduct } from "../hooks/useProduct";

/** El título ("Nuevo producto"/"Editar producto") lo muestra el header nativo del Stack, ver
 *  `app/(app)/products/_layout.tsx` — esta pantalla no repite un título propio. */
export function ProductFormScreen() {
  const { id, barcode } = useLocalSearchParams<{ id?: string; barcode?: string }>();
  const productId = id ? Number(id) : undefined;
  const { data: product, isLoading, error } = useProduct(productId);
  useAuthErrorRedirect(error);

  if (productId !== undefined && isLoading) {
    return (
      <ScreenContainer>
        <LoadingState message="Cargando producto…" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ProductForm
        product={product}
        initialBarcode={productId === undefined ? barcode : undefined}
      />
    </ScreenContainer>
  );
}
