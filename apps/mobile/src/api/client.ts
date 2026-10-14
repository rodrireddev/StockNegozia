import { getBackendUrl } from "@/config/backendUrlStore";
import { secureCredentialStore } from "@/auth/SecureCredentialStore";
import { AuthRequiredError, BackendNotConfiguredError, NetworkError } from "./errors";

/**
 * Wrapper delgado sobre `fetch`, mismo criterio que `apps/web-client/src/api.ts` — sin librería
 * de HTTP nueva. React Native `fetch` no envía `Origin` (no es un navegador), así que no pasa por
 * CORS — ver docs/lan/DEVICE_MANAGEMENT.md §CORS; no hace falta ningún cambio de backend.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getBackendUrl();
  if (!baseUrl) throw new BackendNotConfiguredError();

  const credential = await secureCredentialStore.getCredential();
  const headers = new Headers(init?.headers);
  if (credential) headers.set("Authorization", `Bearer ${credential}`);
  if (init?.body) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  } catch (error) {
    throw new NetworkError(error);
  }

  if (response.status === 401) {
    await secureCredentialStore.clearCredential();
    throw new AuthRequiredError();
  }
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, path));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function extractErrorMessage(response: Response, path: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string") return body.message;
  } catch {
    // el cuerpo no era JSON — se usa el mensaje genérico
  }
  return `Request to ${path} failed with status ${response.status}`;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
