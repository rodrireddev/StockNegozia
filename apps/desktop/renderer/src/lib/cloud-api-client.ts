/**
 * Cliente para `apps/cloud-backend` — separado de `api-client.ts` (el backend local de
 * SQLite/LAN pairing, con base URL inyectada por Electron vía preload). Este otro backend es
 * nuevo para `apps/desktop`: hoy solo lo usa el banner pasivo del sidebar derecho (house ad,
 * siempre público — sin cuenta, `apps/desktop` no tiene sistema de login cloud todavía).
 */
const cloudBackendBaseUrl = import.meta.env.VITE_CLOUD_BACKEND_URL ?? "http://localhost:38200";

async function handleResponse<T>(response: Response, path: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function cloudApiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${cloudBackendBaseUrl}${path}`);
  return handleResponse<T>(response, path);
}

export async function cloudApiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${cloudBackendBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response, path);
}
