import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * No es un dato sensible — mismo criterio que `theme/themeStore.ts` (`AsyncStorage`, no
 * `SecureStore`). Se marca una sola vez y para siempre en este dispositivo: "solo la primera vez
 * que instalan la app", no cada vez que la abren.
 */
const STORAGE_KEY = "stocknegozia.benefitsOnboardingSeen";

let cachedSeen: boolean | null = null;

/** Lectura síncrona para el bootstrap de `RootLayout` — `null` hasta que `loadOnboardingSeen()` corra. */
export function getOnboardingSeen(): boolean | null {
  return cachedSeen;
}

export async function loadOnboardingSeen(): Promise<boolean> {
  try {
    cachedSeen = (await AsyncStorage.getItem(STORAGE_KEY)) === "true";
  } catch {
    // Sin storage disponible, se asume "no visto" — es preferible mostrarlo de más una vez a
    // dejar a alguien sin la explicación por un error transitorio.
    cachedSeen = false;
  }
  return cachedSeen;
}

export async function markOnboardingSeen(): Promise<void> {
  cachedSeen = true;
  await AsyncStorage.setItem(STORAGE_KEY, "true");
}
