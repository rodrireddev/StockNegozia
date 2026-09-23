import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AdminLoginResult } from "@stocknegozia/api-contracts";
import { PasswordService } from "../common/password.service";
import { ADMIN_SESSION_TTL_SECONDS } from "./admin-auth.constants";
import { AdminUsersRepository } from "./admin-users.repository";

export interface AdminJwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AdminAuthService {
  // @Inject explícito en todos los parámetros — mismo motivo que en apps/backend (esbuild/Vitest
  // no emite la metadata de tipos que la inyección automática de NestJS necesita).
  constructor(
    @Inject(AdminUsersRepository) private readonly repository: AdminUsersRepository,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<AdminLoginResult> {
    const admin = await this.repository.findByEmail(email);
    if (!admin || !this.passwordService.verify(password, admin.passwordHash)) {
      throw new UnauthorizedException("Email o contraseña inválidos");
    }

    const payload: AdminJwtPayload = { sub: admin.id, email: admin.email };
    const accessToken = await this.jwtService.signAsync(payload);
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000);
    return { accessToken, expiresAt: expiresAt.toISOString() };
  }
}
