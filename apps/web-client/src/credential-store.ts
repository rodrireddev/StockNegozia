/**
 * `localStorage` es una solución de desarrollo/prototipo para este cliente de prueba LAN (M14) —
 * ver docs/lan/DEVICE_MANAGEMENT.md §Storage del token. Antes de un cliente web de producción hay
 * que revisar esto (por ejemplo, un almacenamiento no accesible por cualquier script de la misma
 * página). No se pone en código, `.env`, la URL, ni SQLite del servidor.
 */
const STORAGE_KEY = "stocknegozia.deviceCredential";

export function getStoredCredential(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredCredential(credential: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, credential);
  } catch {
    // localStorage puede no estar disponible (modo privado, cuotas) — el cliente sigue
    // funcionando para esta sesión, simplemente no persiste entre recargas.
  }
}

export function clearStoredCredential(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ver comentario de setStoredCredential.
  }
}
