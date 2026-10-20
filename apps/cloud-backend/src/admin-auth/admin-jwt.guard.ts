import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ADMIN_JWT_SERVICE } from "./admin-auth.constants";
import type { AdminJwtPayload } from "./admin-auth.service";

/** Poblado por este guard sobre la request cuando el JWT es válido. */
export interface RequestWithAdmin {
  admin?: { id: string; email: string };
  headers: Record<string, string | string[] | undefined>;
}

function extractBearerToken(header: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(header) ? header[0] : header;
  if (!raw) return undefined;
  const [scheme, token] = raw.split(" ");
  if (scheme !== "Bearer" || !token) return undefined;
  return token;
}

/**
 * Protege todas las rutas `/admin/*` salvo `/admin/auth/login` — a diferencia de
 * `ApiAccessGuard`/`AdminDeviceGuard` de apps/backend, este NO tiene un modo "development" que
 * deje pasar todo: el panel admin siempre exige login, incluso en desarrollo, porque toca la
 * config de créditos real desde el día uno.
 */
@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(@Inject(ADMIN_JWT_SERVICE) private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException("Falta el token de administrador");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AdminJwtPayload>(token);
      request.admin = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException("Token de administrador inválido o expirado");
    }
  }
}
