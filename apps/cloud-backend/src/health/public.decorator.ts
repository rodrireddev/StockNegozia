import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marca una ruta como accesible sin autenticación. Todavía no hay ningún guard global que lo lea
 * (el auth de cuentas de comercio, doc §3, no está implementado) — existe ya para que `/health`
 * quede exceptuado desde el día uno, igual que `@Public()` en apps/backend.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
