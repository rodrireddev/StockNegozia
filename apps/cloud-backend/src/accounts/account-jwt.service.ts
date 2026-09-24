import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AccountJwtPayload } from "./account-jwt.guard";

/**
 * Único punto que inyecta el `JwtService` de cuentas — así ningún otro módulo necesita ver
 * `JwtModule` crudo (evita que dos `JwtModule.registerAsync` con secretos distintos, el de
 * cuentas y el de admin, choquen si un mismo módulo llega a importar ambos auth modules).
 */
@Injectable()
export class AccountJwtService {
  constructor(@Inject(JwtService) private readonly jwtService: JwtService) {}

  async sign(payload: AccountJwtPayload): Promise<{ accessToken: string; expiresAt: string }> {
    const accessToken = await this.jwtService.signAsync(payload);
    const decoded = this.jwtService.decode(accessToken) as { exp: number };
    return { accessToken, expiresAt: new Date(decoded.exp * 1000).toISOString() };
  }
}
