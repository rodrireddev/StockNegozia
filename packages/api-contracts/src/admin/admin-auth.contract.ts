/** Respuesta de `POST /admin/auth/login`. */
export interface AdminLoginResult {
  accessToken: string;
  /** ISO 8601 — cuándo expira `accessToken`, para que el panel sepa cuándo pedir login de nuevo. */
  expiresAt: string;
}
