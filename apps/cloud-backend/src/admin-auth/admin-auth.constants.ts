/** Duración de la sesión del panel admin antes de tener que loguearse de nuevo. */
export const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;

/** Token propio para el `JwtService` de admin — ver el comentario de `ACCOUNT_JWT_SERVICE` en
 *  `accounts/account-auth.constants.ts` (mismo motivo, evita el choque cuando un módulo importa
 *  ambos auth modules a la vez). */
export const ADMIN_JWT_SERVICE = Symbol("ADMIN_JWT_SERVICE");
