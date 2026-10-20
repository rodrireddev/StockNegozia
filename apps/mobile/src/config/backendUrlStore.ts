import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDefaultDevApiUrl } from "./env";

/**
 * La URL del backend NO es un secreto (es una IP LAN, análoga a la que cualquiera vería en la
 * pantalla del Desktop) — por eso usa `AsyncStorage`, no `SecureStore`. Ver
 * `src/auth/SecureCredentialStore.ts` para el contraste con la credential, que sí es un secreto.
 */
const STORAGE_KEY = "stocknegozia.backendUrl";

let cachedUrl: string | null = null;

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** Se llama una vez al iniciar la app (junto con la carga de la credential) para hidratar el caché en memoria. */
export async function loadBackendUrl(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    cachedUrl = stored ? normalize(stored) : getDefaultDevApiUrl();
  } catch {
    cachedUrl = getDefaultDevApiUrl();
  }
  return cachedUrl;
}

/** Lectura síncrona para el cliente HTTP — asume que `loadBackendUrl()` ya corrió al arrancar. */
export function getBackendUrl(): string | null {
  return cachedUrl;
}

export async function setBackendUrl(url: string): Promise<void> {
  const normalized = normalize(url);
  cachedUrl = normalized;
  await AsyncStorage.setItem(STORAGE_KEY, normalized);
}
