import type { DeviceDto, HealthStatus, PairingConfirmResult, ProductDto } from "@stocknegozia/api-contracts";
import { resolveApiUrl } from "./config";
import { clearStoredCredential, getStoredCredential } from "./credential-store";

/**
 * `ApiAccessGuard` siempre devuelve un 401 genérico ante cualquier falla de auth (credential
 * ausente, inválida o revocada) — decisión de anti-enumeración ya tomada por el backend, ver
 * docs/security/API_ACCESS.md. Este cliente no intenta distinguir el motivo: cualquier 401 en un
 * endpoint protegido significa "este dispositivo ya no puede usar la API", así que limpia la
 * credential guardada y se lo señala al caller para que vuelva a la pantalla de pairing.
 */
export class AuthRequiredError extends Error {
  constructor() {
    super("Este dispositivo no está autorizado. Es necesario volver a emparejarlo.");
    this.name = "AuthRequiredError";
  }
}

/**
 * Mismo criterio que `apps/desktop/renderer/src/lib/api-client.ts`: wrapper delgado sobre
 * `fetch`, sin librería de HTTP nueva. A diferencia del cliente Desktop (donde la credential se
 * adjunta a nivel de sesión de Electron), acá el renderer sí maneja la credential directamente —
 * ver `credential-store.ts`.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const credential = getStoredCredential();
  const headers = new Headers(init?.headers);
  if (credential) headers.set("Authorization", `Bearer ${credential}`);
  if (init?.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${resolveApiUrl()}${path}`, { ...init, headers });

  if (response.status === 401) {
    clearStoredCredential();
    throw new AuthRequiredError();
  }
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, path));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
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

/**
 * Confirma el pairing (endpoint `@Public()` — no requiere credential previa). Un 401 acá no
 * significa "este dispositivo perdió autorización" (todavía no tiene ninguna) sino "el token, el
 * código o el pairing están mal/vencidos" — se traduce a un mensaje distinto del de
 * `AuthRequiredError`, aunque `request()` limpie igual cualquier credential guardada (no hace daño
 * si no había ninguna).
 */
export async function confirmPairing(input: {
  pairingId: string;
  token: string;
  verificationCode: string;
  deviceName?: string;
}): Promise<PairingConfirmResult> {
  try {
    return await post<PairingConfirmResult>("/auth/pairing/confirm", { ...input, deviceType: "web" });
  } catch (error) {
    if (error instanceof AuthRequiredError) {
      throw new Error("No se pudo emparejar: código o datos incorrectos, o el pairing expiró.");
    }
    throw error;
  }
}

/** Verifica el estado del dispositivo autenticado — dispara `AuthRequiredError` si ya no lo está. */
export function getMe(): Promise<DeviceDto> {
  return get<DeviceDto>("/auth/devices/me");
}
