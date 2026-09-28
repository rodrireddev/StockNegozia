import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Id estable por instalación (no por cuenta) — se combina con el id local del outbox
 * (`gamification-outbox.ts`) para armar un `clientEventId` único incluso si la misma cuenta se usa
 * en más de un dispositivo (los ids autoincrement de SQLite son por dispositivo, no globales). No
 * necesita ser criptográficamente fuerte, solo practicamente único — no es un secreto ni un token.
 */
const STORAGE_KEY = "stocknegozia.syncDeviceId";

let cached: string | null = null;

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getSyncDeviceId(): Promise<string> {
  if (cached) return cached;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      cached = stored;
      return stored;
    }
  } catch {
    // Sin AsyncStorage disponible (raro) — se genera uno nuevo en memoria, sin persistir; peor
    // caso, el próximo arranque genera otro (el `clientEventId` sigue siendo único por evento).
  }

  const generated = generateId();
  cached = generated;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, generated);
  } catch {
    // idem — no bloquea, ver comentario de arriba.
  }
  return generated;
}
