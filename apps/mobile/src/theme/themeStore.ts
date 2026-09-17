import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "light" | "dark" | "system" | "pastel" | "solarized" | "nord";

const VALID_MODES: readonly ThemeMode[] = [
  "light",
  "dark",
  "system",
  "pastel",
  "solarized",
  "nord",
];

function isThemeMode(value: string): value is ThemeMode {
  return (VALID_MODES as readonly string[]).includes(value);
}

/**
 * El tema NO es un dato sensible (a diferencia de la credential, ver
 * `src/auth/SecureCredentialStore.ts`) — usa `AsyncStorage`, mismo criterio que
 * `src/config/backendUrlStore.ts` para la URL del backend.
 */
const STORAGE_KEY = "stocknegozia.themeMode";

let cachedMode: ThemeMode | null = null;

/** Lectura síncrona para el bootstrap de `ThemeProvider` — `null` hasta que `loadThemeMode()` corra. */
export function getThemeMode(): ThemeMode | null {
  return cachedMode;
}

/** Se llama una vez al montar `ThemeProvider` para hidratar el caché en memoria. */
export async function loadThemeMode(): Promise<ThemeMode> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    cachedMode = stored && isThemeMode(stored) ? stored : "system";
  } catch {
    cachedMode = "system";
  }
  return cachedMode;
}

export async function persistThemeMode(mode: ThemeMode): Promise<void> {
  cachedMode = mode;
  await AsyncStorage.setItem(STORAGE_KEY, mode);
}
