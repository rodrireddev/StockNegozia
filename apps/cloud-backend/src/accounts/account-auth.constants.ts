/**
 * Sesión larga a propósito: es una app de comercio de uso diario (doc, "Principio rector"), no
 * tiene sentido pedir login de nuevo seguido — 30 días, bastante más que las 12h del panel admin.
 */
export const ACCOUNT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Token propio (no la clase `JwtService` cruda) para el `JwtService` de cuentas — si un módulo
 * importa a la vez `AccountAuthModule` y `AdminAuthModule` (p. ej. `AdsModule`), Nest reconstruye
 * `AccountJwtGuard`/`AdminJwtGuard` dentro de ESE módulo (por venir referenciados por clase en
 * `@UseGuards`), y con el token `JwtService` compartido por ambos, la resolución termina eligiendo
 * el `JwtService` equivocado (el de admin) para el guard de cuentas — 401 "invalid signature" con
 * un JWT de cuenta válido. Un token distinto por dominio elimina la ambigüedad.
 */
export const ACCOUNT_JWT_SERVICE = Symbol("ACCOUNT_JWT_SERVICE");
