/**
 * Cliente para `apps/cloud-backend` — separado de `api-client.ts` (el backend local de
 * SQLite/LAN pairing, con base URL inyectada por Electron vía preload). Adjunta el JWT de cuenta
 * cloud (doc ADS_CREDITS_GAMIFICATION.md §6) leído del bridge `window.cloudAccount` cuando hay uno
 * guardado — nunca de `localStorage`. Sin sesión, sigue funcionando sin auth: el house-ad banner
 * (`features/ads`), el único consumidor antes de esto, siempre fue público.
 */
const cloudBackendBaseUrl = import.meta.env.VITE_CLOUD_BACKEND_URL ?? "http://localhost:38200";

/** El JWT de cuenta cloud no está, es inválido o venció — hay que volver a mostrar login. */
export class AuthRequiredError extends Error {
  constructor() {
    super("Tu sesión venció. Iniciá sesión de nuevo.");
    this.name = "AuthRequiredError";
  }
}

/**
 * Error de la API con un `code` estructurado además del mensaje — mismo criterio que
 * `mobile-mini/src/accounts/api/errors.ts`. Hoy solo lo usa `CAPTCHA_REQUIRED` (login), para que
 * `LoginForm` sepa mostrar el widget de Turnstile en vez de solo mostrar el mensaje como un error
 * de credenciales más.
 */
export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

async function extractError(response: Response, path: string): Promise<{ message: string; code?: string }> {
  try {
    const body = (await response.json()) as { message?: unknown; code?: unknown };
    return {
      message: typeof body.message === "string" ? body.message : `Request to ${path} failed with status ${response.status}`,
      code: typeof body.code === "string" ? body.code : undefined,
    };
  } catch {
    return { message: `Request to ${path} failed with status ${response.status}` };
  }
}

async function handleResponse<T>(response: Response, path: string): Promise<T> {
  if (response.status === 401) {
    // Limpia la credential guardada (y el proxy `apps/backend`, vía `clearToken`) — sin esto, cada
    // request futuro seguiría fallando en el mismo 401 silenciosamente.
    await window.cloudAccount.clearToken();
    throw new AuthRequiredError();
  }
  if (!response.ok) {
    const { message, code } = await extractError(response, path);
    throw new ApiError(message, code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function withAuthHeaders(init?: RequestInit): Promise<RequestInit> {
  const token = await window.cloudAccount.getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

export async function cloudApiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${cloudBackendBaseUrl}${path}`, await withAuthHeaders());
  return handleResponse<T>(response, path);
}

export async function cloudApiPost<T>(path: string, body?: unknown): Promise<T> {
  const init = await withAuthHeaders({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const response = await fetch(`${cloudBackendBaseUrl}${path}`, init);
  return handleResponse<T>(response, path);
}
