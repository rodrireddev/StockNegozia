/**
 * `ApiAccessGuard` siempre devuelve un 401 genérico ante cualquier falla de auth (credential
 * ausente, inválida o revocada) — decisión de anti-enumeración del backend, ver
 * docs/security/API_ACCESS.md. Igual que `apps/web-client/src/api.ts`, este cliente no intenta
 * distinguir el motivo: cualquier 401 en un endpoint protegido significa "este dispositivo ya no
 * puede usar la API", así que limpia la credential guardada y señala al caller que debe volver a
 * emparejarse.
 */
export class AuthRequiredError extends Error {
  constructor() {
    super("Este dispositivo no está autorizado. Es necesario volver a emparejarlo.");
    this.name = "AuthRequiredError";
  }
}

/** El backend no es alcanzable (LAN mal configurada, backend apagado, firewall) — no es un 401. */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super("No se pudo conectar con StockNegozia. Verificá la dirección del backend y la red.");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

/** No hay una URL de backend configurada todavía — distinto de un error de red real. */
export class BackendNotConfiguredError extends Error {
  constructor() {
    super("Configurá la dirección del backend antes de continuar.");
    this.name = "BackendNotConfiguredError";
  }
}
