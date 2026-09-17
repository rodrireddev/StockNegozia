import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Nombre del negocio mostrado en el encabezado del recibo PDF en vez de "StockNegozia" — dato no
 * sensible, mismo criterio que `theme/themeStore.ts` (usa `AsyncStorage`, no `SecureStore`). A
 * diferencia del tema, acá no hace falta un caché en memoria: no hay riesgo de "flash" al bootear
 * la UI, se lee de forma async cuando hace falta (pantalla de Ajustes, generación del recibo).
 */
const STORAGE_KEY = "stocknegozia.businessName";

export async function getBusinessName(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setBusinessName(value: string | null): Promise<void> {
  if (value === null) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, value);
}
