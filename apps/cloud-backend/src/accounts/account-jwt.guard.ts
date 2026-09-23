import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export interface AccountJwtPayload {
  sub: string;
  email: string;
}

/** Poblado por este guard sobre la request cuando el JWT de la cuenta es válido. */
export interface RequestWithAccount {
  account?: { id: string; email: string };
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
 * Protege los endpoints que exigen cuenta de comercio (créditos, racha) — separado de
 * `AdminJwtGuard` (verifica contra `ACCOUNT_JWT_SECRET`, no `ADMIN_JWT_SECRET`; son dos sistemas
 * de auth distintos, doc §7).
 */
@Injectable()
export class AccountJwtGuard implements CanActivate {
  constructor(@Inject(JwtService) private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAccount>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException("Falta el token de la cuenta");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccountJwtPayload>(token);
      request.account = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException("Token de cuenta inválido o expirado");
    }
  }
}
