import { useState } from "react";
import { Image, Keyboard, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ProductDto } from "@stocknegozia/api-contracts";
import { createProductSchema, updateProductSchema } from "@stocknegozia/validation";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Select } from "@/components/Select";
import { TextField } from "@/components/TextField";
import { ProductPhotoCapture } from "@/features/products/components/ProductPhotoCapture";
import { ProductScanner } from "@/features/scanner/ProductScanner";
import type { ScanResult } from "@/features/scanner/types";
import { useTheme } from "@/theme/useTheme";
import { radius, spacing, typography } from "@/theme/tokens";
import { useSuppliers } from "@/features/suppliers/hooks/useSuppliers";
import { estimateBase64Bytes, MAX_IMAGE_BYTES } from "../utils/image";
import { useCategories } from "../hooks/useCategories";
import { useCreateProduct } from "../hooks/useCreateProduct";
import { useUpdateProduct } from "../hooks/useUpdateProduct";

/** Misma calidad JPEG que `ProductPhotoCapture` (cámara) — mantiene una foto típica bien por
 *  debajo de `MAX_IMAGE_BYTES` sin agregar un paso de redimensionado aparte. */
const GALLERY_QUALITY = 0.5;

const NEW_CATEGORY_VALUE = "__new__";
const NO_CATEGORY_VALUE = "";
const NEW_SUPPLIER_VALUE = "__new__";

interface ProductFormState {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  categorySelect: string;
  categoryName: string;
  purchasePrice: string;
  salePrice: string;
  stock: string;
  minimumStock: string;
  supplierSelect: string;
  supplierName: string;
  image: string;
  active: boolean;
}

function toFormState(product?: ProductDto, initialBarcode?: string): ProductFormState {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? initialBarcode ?? "",
    description: product?.description ?? "",
    categorySelect: product?.categoryId ? String(product.categoryId) : "",
    categoryName: "",
    purchasePrice: product ? String(product.purchasePrice) : "",
    salePrice: product ? String(product.salePrice) : "",
    stock: product ? String(product.stock) : "0",
    minimumStock: product ? String(product.minimumStock) : "0",
    supplierSelect: "",
    supplierName: "",
    image: product?.image ?? "",
    active: product?.active ?? true,
  };
}

export function ProductForm({
  product,
  initialBarcode,
}: {
  product?: ProductDto;
  initialBarcode?: string;
}) {
  const isEdit = product !== undefined;
  const router = useRouter();
  const { colors } = useTheme();
  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useSuppliers();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(product?.id ?? 0);

  const [form, setForm] = useState<ProductFormState>(() => toFormState(product, initialBarcode));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false);

  const isPending = createProduct.isPending || updateProduct.isPending;

  function update<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /** Alternativa a `ProductPhotoCapture` (cámara): elegir una foto ya existente de la galería del
   *  teléfono. Mismo formato de salida (data URI base64) y mismo límite de tamaño, para que
   *  `products.image` se comporte igual sin importar de dónde vino la foto. */
  async function handlePickFromGallery() {
    setFormError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: GALLERY_QUALITY,
    });
    if (result.canceled) return;

    const base64 = result.assets[0]?.base64;
    if (!base64) {
      setFormError("No se pudo cargar esa foto. Probá con otra.");
      return;
    }
    const dataUri = `data:image/jpeg;base64,${base64}`;
    if (estimateBase64Bytes(dataUri) > MAX_IMAGE_BYTES) {
      setFormError("La imagen no puede superar los 2MB — probá con otra foto.");
      return;
    }
    update("image", dataUri);
  }

  function buildBasePayload() {
    return {
      name: form.name,
      sku: form.sku,
      barcode: form.barcode,
      description: form.description,
      categoryId:
        form.categorySelect && form.categorySelect !== NEW_CATEGORY_VALUE
          ? form.categorySelect
          : undefined,
      categoryName: form.categorySelect === NEW_CATEGORY_VALUE ? form.categoryName : undefined,
      purchasePrice: form.purchasePrice,
      salePrice: form.salePrice,
      minimumStock: form.minimumStock,
      image: form.image,
      active: form.active,
    };
  }

  function handleSubmit() {
    setFormError(null);

    const onSuccess = () => router.replace("/products");
    const onError = (error: Error) => setFormError(error.message);

    if (isEdit) {
      const result = updateProductSchema.safeParse(buildBasePayload());
      if (!result.success) {
        setFieldErrors(result.error.flatten().fieldErrors as Record<string, string[]>);
        return;
      }
      setFieldErrors({});
      updateProduct.mutate(result.data, { onSuccess, onError });
    } else {
      const result = createProductSchema.safeParse({
        ...buildBasePayload(),
        stock: form.stock,
        supplierId:
          form.supplierSelect && form.supplierSelect !== NEW_SUPPLIER_VALUE
            ? form.supplierSelect
            : undefined,
        supplierName: form.supplierSelect === NEW_SUPPLIER_VALUE ? form.supplierName : undefined,
      });
      if (!result.success) {
        setFieldErrors(result.error.flatten().fieldErrors as Record<string, string[]>);
        return;
      }
      setFieldErrors({});
      createProduct.mutate(result.data, { onSuccess, onError });
    }
  }

  const categoryOptions = [
    { value: NO_CATEGORY_VALUE, label: "Sin categoría" },
    ...categories.map((category) => ({ value: String(category.id), label: category.name })),
    { value: NEW_CATEGORY_VALUE, label: "+ Nueva categoría…" },
  ];

  const supplierOptions = [
    ...suppliers.map((supplier) => ({ value: String(supplier.id), label: supplier.name })),
    { value: NEW_SUPPLIER_VALUE, label: "+ Nuevo proveedor…" },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {formError && (
        <View style={[styles.errorBanner, { backgroundColor: colors.danger + "20" }]}>
          <Text style={{ color: colors.danger }}>{formError}</Text>
        </View>
      )}

      <TextField label="Nombre *" value={form.name} onChangeText={(v) => update("name", v)} />
      {fieldErrors.name && <Text style={{ color: colors.danger }}>{fieldErrors.name[0]}</Text>}

      <TextField label="SKU *" value={form.sku} onChangeText={(v) => update("sku", v)} />
      {fieldErrors.sku && <Text style={{ color: colors.danger }}>{fieldErrors.sku[0]}</Text>}

      <TextField
        label="Código de barras"
        value={form.barcode}
        onChangeText={(v) => update("barcode", v)}
      />
      <Button
        label="📷 Escanear"
        variant="secondary"
        onPress={() => {
          // Cierra el teclado antes de abrir la cámara — si quedaba abierto (por ejemplo, tras
          // tipear en un campo de texto), la ventana puede quedar con una altura reducida hasta
          // que Android termina de reacomodarla (ver el mismo ajuste en ProductPhotoCapture).
          Keyboard.dismiss();
          setScannerOpen(true);
        }}
        testID="scan-product-barcode"
      />
      <ProductScanner
        visible={scannerOpen}
        onDetected={(result: ScanResult) => {
          setScannerOpen(false);
          update("barcode", result.code);
        }}
        onCancel={() => setScannerOpen(false)}
      />

      <TextField
        label="Descripción"
        value={form.description}
        onChangeText={(v) => update("description", v)}
        multiline
      />

      <Select
        label="Categoría"
        value={form.categorySelect}
        options={categoryOptions}
        onChange={(v) => update("categorySelect", v)}
      />

      {form.categorySelect === NEW_CATEGORY_VALUE && (
        <TextField
          label="Nombre de la nueva categoría"
          value={form.categoryName}
          onChangeText={(v) => update("categoryName", v)}
        />
      )}

      <TextField
        label="Precio de compra *"
        value={form.purchasePrice}
        onChangeText={(v) => update("purchasePrice", v)}
        keyboardType="decimal-pad"
      />
      {fieldErrors.purchasePrice && (
        <Text style={{ color: colors.danger }}>{fieldErrors.purchasePrice[0]}</Text>
      )}

      <TextField
        label="Precio de venta *"
        value={form.salePrice}
        onChangeText={(v) => update("salePrice", v)}
        keyboardType="decimal-pad"
      />
      {fieldErrors.salePrice && (
        <Text style={{ color: colors.danger }}>{fieldErrors.salePrice[0]}</Text>
      )}

      {!isEdit && (
        <TextField
          label="Stock inicial"
          value={form.stock}
          onChangeText={(v) => update("stock", v)}
          keyboardType="number-pad"
        />
      )}

      {!isEdit && form.stock !== "0" && (
        <Select
          label="Proveedor del stock inicial *"
          value={form.supplierSelect}
          options={supplierOptions}
          placeholder="Seleccionar proveedor"
          onChange={(v) => update("supplierSelect", v)}
        />
      )}
      {!isEdit && form.stock !== "0" && fieldErrors.supplierId && (
        <Text style={{ color: colors.danger }}>{fieldErrors.supplierId[0]}</Text>
      )}

      {!isEdit && form.stock !== "0" && form.supplierSelect === NEW_SUPPLIER_VALUE && (
        <TextField
          label="Nombre del nuevo proveedor"
          value={form.supplierName}
          onChangeText={(v) => update("supplierName", v)}
        />
      )}

      <TextField
        label="Stock mínimo"
        value={form.minimumStock}
        onChangeText={(v) => update("minimumStock", v)}
        keyboardType="number-pad"
      />
      {fieldErrors.minimumStock && (
        <Text style={{ color: colors.danger }}>{fieldErrors.minimumStock[0]}</Text>
      )}

      <View style={styles.imageSection}>
        <Text style={[typography.label, { color: colors.mutedForeground }]}>Imagen</Text>
        {form.image ? (
          <View style={styles.imageRow}>
            <Image source={{ uri: form.image }} style={styles.imagePreview} resizeMode="cover" />
            <Button
              label="Quitar foto"
              variant="ghost"
              onPress={() => update("image", "")}
              testID="remove-product-photo"
            />
          </View>
        ) : (
          <View style={styles.imageButtons}>
            <Button
              label="📷 Tomar foto"
              variant="secondary"
              onPress={() => {
                Keyboard.dismiss();
                setPhotoCaptureOpen(true);
              }}
              testID="take-product-photo"
            />
            <Button
              label="🖼️ Elegir de la galería"
              variant="secondary"
              onPress={() => {
                Keyboard.dismiss();
                void handlePickFromGallery();
              }}
              testID="pick-product-photo"
            />
          </View>
        )}
      </View>
      <ProductPhotoCapture
        visible={photoCaptureOpen}
        onCaptured={(dataUri) => {
          setPhotoCaptureOpen(false);
          update("image", dataUri);
        }}
        onCancel={() => setPhotoCaptureOpen(false)}
      />

      {isEdit && (
        <Checkbox
          label="Producto activo"
          checked={form.active}
          onChange={(v) => update("active", v)}
        />
      )}

      <View style={styles.actions}>
        <Button
          label={isEdit ? "Guardar cambios" : "Crear producto"}
          onPress={handleSubmit}
          loading={isPending}
        />
        <Button
          label="Cancelar"
          variant="ghost"
          onPress={() => router.back()}
          disabled={isPending}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  errorBanner: { borderRadius: 8, padding: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  imageSection: { gap: spacing.xs },
  imageButtons: { gap: spacing.sm },
  imageRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  imagePreview: { width: 64, height: 64, borderRadius: radius.md },
});
