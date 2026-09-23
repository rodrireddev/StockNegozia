/** El JWT de cuenta no está, es inválido o venció — hay que volver a mostrar login. */
export class AuthRequiredError extends Error {
  constructor() {
    super("Tu sesión venció. Iniciá sesión de nuevo.");
    this.name = "AuthRequiredError";
  }
}

/** El backend no es alcanzable (sin internet, `apps/cloud-backend` caído) — no es un 401. */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super("No se pudo conectar. Verificá tu conexión a internet.");
    this.name = "NetworkError";
    this.cause = cause;
  }
}
