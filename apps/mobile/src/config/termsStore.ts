import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Aceptación de términos y condiciones — simulada (ver
 * `src/features/pairing/components/steps/TermsStep.tsx`): StockNegozia todavía no tiene un texto
 * legal real, así que este paso solo deja registrado que la persona lo confirmó antes de emparejar
 * el dispositivo. No es un dato sensible — se persiste en `AsyncStorage`, igual que la URL del
 * backend (`backendUrlStore.ts`), nunca junto a la credential.
 */
const STORAGE_KEY = "stocknegozia.termsAcceptedAt";

export async function hasAcceptedTerms(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) !== null;
  } catch {
    return false;
  }
}

export async function acceptTerms(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
}
