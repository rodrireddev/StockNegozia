import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContextStore {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

/**
 * Permite que Services/Repositories obtengan el `requestId` del request HTTP en curso sin que
 * nadie tenga que pasarlo manualmente por Controller → Service → Repository.
 */
export const RequestContext = {
  run<T>(store: RequestContextStore, fn: () => T): T {
    return storage.run(store, fn);
  },
  getRequestId(): string | undefined {
    return storage.getStore()?.requestId;
  },
};
