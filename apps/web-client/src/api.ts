import type { HealthStatus, ProductDto } from "@stocknegozia/api-contracts";
import { resolveApiUrl } from "./config";

/**
 * Mismo criterio que `apps/desktop/renderer/src/lib/api-client.ts`: wrapper delgado sobre
 * `fetch`, sin librería de HTTP nueva. La diferencia con el cliente Desktop es que ahí la
 * credential se adjunta a nivel de sesión de Electron (el renderer ni se entera) — acá no hay
 * credential todavía (`API_ACCESS_MODE=development`, ver docs/security/API_ACCESS.md): esa
 * autenticación de dispositivos LAN es explícitamente **M14**, no este milestone.
 */
async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${resolveApiUrl()}${path}`);
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, path));
  }
  return response.json() as Promise<T>;
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

export function checkHealth(): Promise<HealthStatus> {
  return get<HealthStatus>("/health");
}

export function loadProducts(): Promise<ProductDto[]> {
  return get<ProductDto[]>("/products");
}
