import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marca un endpoint como público — `ApiAccessGuard` lo deja pasar sin credential incluso en
 * `API_ACCESS_MODE=production`. Reservado para health check y bootstrap inicial (ver
 * docs/security/API_ACCESS.md); todo endpoint de negocio nuevo se considera protegido por defecto.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
