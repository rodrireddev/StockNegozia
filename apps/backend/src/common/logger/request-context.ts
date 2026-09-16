import { AsyncLocalStorage } from "node:async_hooks";

/** Identidad mínima del dispositivo autenticado — ver `ApiAccessGuard` y `RequestContext.setDevice()`. */
export interface RequestContextDevice {
  id: string;
  name: string;
  type: "desktop" | "mobile" | "tablet" | "web" | "other";
  /**
   * "Vendedor actual" configurado en este dispositivo (`PATCH /auth/devices/me/seller-name`) —
   * distinto de `name`, que es el nombre del dispositivo en sí. Quien decide si reemplaza a `name`
   * en el snapshot de `stock_movements` es `StockMovementsService.record()`, no este store.
   */
  sellerName?: string | null;
}

export interface RequestContextStore {
  requestId: string;
  /**
   * Poblado por `ApiAccessGuard` (`setDevice()`), no en `run()` — el middleware que abre el
   * contexto corre ANTES de que el guard autentique la request, así que el dispositivo todavía no
   * se conoce en ese punto (ver `RequestContextMiddleware`). Queda `undefined` en
   * `API_ACCESS_MODE=development` (no hay autenticación) y fuera de un contexto HTTP.
   */
  device?: RequestContextDevice;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

/**
 * Permite que Services/Repositories obtengan el `requestId`/dispositivo del request HTTP en curso
 * sin que nadie tenga que pasarlos manualmente por Controller → Service → Repository.
 */
export const RequestContext = {
  run<T>(store: RequestContextStore, fn: () => T): T {
    return storage.run(store, fn);
  },
  getRequestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
  /**
   * Muta el store de la request en curso para agregar el dispositivo autenticado — llamado por
   * `ApiAccessGuard` una vez que resuelve la credential. `AsyncLocalStorage.getStore()` devuelve
   * la MISMA referencia de objeto que `run()` recibió, así que esta mutación es visible para
   * cualquier lectura posterior dentro de la misma request (Service/Repository), sin necesitar
   * volver a abrir el contexto. No-op fuera de un contexto HTTP (no debería llamarse ahí, pero es
   * seguro si ocurre).
   */
  setDevice(device: RequestContextDevice): void {
    const store = storage.getStore();
    if (store) store.device = device;
  },
  getDevice(): RequestContextDevice | undefined {
    return storage.getStore()?.device;
  },
};
