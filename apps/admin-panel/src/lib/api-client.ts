import { useAuthStore } from "@/stores/auth-store";

const cloudBackendBaseUrl = import.meta.env.VITE_CLOUD_BACKEND_URL ?? "http://localhost:38200";

async function parseErrorMessage(response: Response, path: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string") return body.message;
  } catch {
    // el cuerpo no era JSON — se usa el mensaje genérico
  }
  return `Request to ${path} failed with status ${response.status}`;
}

async function handleResponse<T>(response: Response, path: string): Promise<T> {
  if (response.status === 401) {
    // El JWT expiró o es inválido — sacar la sesión fuerza el login de nuevo (ver LoginPage).
    useAuthStore.getState().clearSession();
  }
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, path));
  }
  return response.json() as Promise<T>;
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().session?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${cloudBackendBaseUrl}${path}`, { headers: authHeaders() });
  return handleResponse<T>(response, path);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${cloudBackendBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response, path);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${cloudBackendBaseUrl}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response, path);
}
