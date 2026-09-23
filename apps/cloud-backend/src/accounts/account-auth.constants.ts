/**
 * Sesión larga a propósito: es una app de comercio de uso diario (doc, "Principio rector"), no
 * tiene sentido pedir login de nuevo seguido — 30 días, bastante más que las 12h del panel admin.
 */
export const ACCOUNT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
