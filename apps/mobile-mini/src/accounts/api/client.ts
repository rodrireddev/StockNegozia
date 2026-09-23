import { secureSessionStore } from "../SecureSessionStore";
import { AuthRequiredError, NetworkError } from "./errors";

/**
 * `EXPO_PUBLIC_*` — Expo inlinea estas variables en build time (ver
 * https://docs.expo.dev/guides/environment-variables/), mismo mecanismo que `VITE_*` en
 * `apps/web-client`/`apps/admin-panel`. Sin la variable, asume el emulador de Android (`10.0.2.2`
 * mapea al `localhost` de la máquina que corre `apps/cloud-backend`) — un dispositivo físico
 * necesita la IP LAN de esa máquina o la URL ya deployada, igual que
 * `apps/web-client/.env.example`.
 */
const CLOUD_BACKEND_URL = process.env.EXPO_PUBLIC_CLOUD_BACKEND_URL ?? "http://10.0.2.2:38200";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = await secureSessionStore.getAccessToken();
  const headers = new Headers(init?.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init?.body) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${CLOUD_BACKEND_URL}${path}`, { ...init, headers });
  } catch (error) {
    throw new NetworkError(error);
  }

  if (response.status === 401) {
    await secureSessionStore.clearAccessToken();
    throw new AuthRequiredError();
  }
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, path));
  }
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
  return request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
}
