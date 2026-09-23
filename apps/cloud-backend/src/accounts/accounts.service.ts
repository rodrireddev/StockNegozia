import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AccountAuthResult, AccountMeDto } from "@stocknegozia/api-contracts";
import { randomBytes, randomUUID } from "node:crypto";
import { CreditConfigService } from "../credit-config/credit-config.service";
import { CreditsService } from "../credits/credits.service";
import { PasswordService } from "../common/password.service";
import type { AccountJwtPayload } from "./account-jwt.guard";
import { ReferralsRepository } from "./referrals.repository";
import { UsersRepository } from "./users.repository";

const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I, se confunden al leerlo en voz alta
const REFERRAL_CODE_LENGTH = 8;

@Injectable()
export class AccountsService {
  // @Inject explícito en todos los parámetros — mismo motivo que en apps/backend (esbuild/Vitest
  // no emite la metadata de tipos que la inyección automática de NestJS necesita).
  constructor(
    @Inject(UsersRepository) private readonly usersRepository: UsersRepository,
    @Inject(ReferralsRepository) private readonly referralsRepository: ReferralsRepository,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(CreditsService) private readonly creditsService: CreditsService,
    @Inject(CreditConfigService) private readonly creditConfigService: CreditConfigService,
  ) {}

  /**
   * Cuenta opcional (doc §3) — este es el flujo "usuario nuevo se registra desde cero". El caso de
   * "ya venía usando la app local y se registra" (migrar productos/ventas/ledger local) es un
   * endpoint aparte, todavía no implementado.
   */
  async register(input: {
    email: string;
    password: string;
    referralCode?: string;
  }): Promise<AccountAuthResult> {
    const existing = await this.usersRepository.findByEmail(input.email);
    if (existing) throw new ConflictException("Ya existe una cuenta con ese email");

    let referrer: Awaited<ReturnType<UsersRepository["findByReferralCode"]>> | undefined;
    if (input.referralCode) {
      referrer = await this.usersRepository.findByReferralCode(input.referralCode);
      if (!referrer) throw new BadRequestException("Código de referido inválido");
    }

    const passwordHash = this.passwordService.hash(input.password);
    const referralCode = await this.generateUniqueReferralCode();
    const userId = randomUUID();

    const user = await this.usersRepository.insert({
      id: userId,
      email: input.email,
      passwordHash,
      referralCode,
      referredByUserId: referrer?.id,
    });

    if (referrer) {
      await this.referralsRepository.insertPending({
        id: randomUUID(),
        referrerUserId: referrer.id,
        referredUserId: user.id,
      });
    }

    // Bienvenida (doc §1) — de una vez, idempotente por si este paso se reintenta.
    const welcomeBonus = await this.creditConfigService.getValueByKey("source.welcome_bonus");
    await this.creditsService.grant(user.id, welcomeBonus, "welcome_bonus", {
      idempotencyKey: `welcome:${user.id}`,
    });

    return this.issueToken(user.id, user.email!);
  }

  async login(email: string, password: string): Promise<AccountAuthResult> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user || !user.passwordHash || !this.passwordService.verify(password, user.passwordHash)) {
      throw new UnauthorizedException("Email o contraseña inválidos");
    }
    return this.issueToken(user.id, user.email!);
  }

  async me(userId: string): Promise<AccountMeDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new UnauthorizedException("Cuenta no encontrada");

    const creditBalance = await this.creditsService.getBalance(userId);
    return {
      id: user.id,
      email: user.email,
      level: user.level,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      referralCode: user.referralCode,
      isCofounder: user.isCofounder,
      creditBalance,
    };
  }

  private async issueToken(userId: string, email: string): Promise<AccountAuthResult> {
    const payload: AccountJwtPayload = { sub: userId, email };
    const accessToken = await this.jwtService.signAsync(payload);
    const decoded = this.jwtService.decode(accessToken) as { exp: number };
    return { accessToken, expiresAt: new Date(decoded.exp * 1000).toISOString() };
  }

  private async generateUniqueReferralCode(): Promise<string> {
    // Colisión es rarísima (32^8 combinaciones) pero no imposible — reintenta en vez de asumir.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = this.randomReferralCode();
      const existing = await this.usersRepository.findByReferralCode(code);
      if (!existing) return code;
    }
    throw new Error("No se pudo generar un código de referido único después de varios intentos");
  }

  private randomReferralCode(): string {
    const bytes = randomBytes(REFERRAL_CODE_LENGTH);
    let code = "";
    for (let i = 0; i < REFERRAL_CODE_LENGTH; i++) {
      code += REFERRAL_CODE_ALPHABET[bytes[i]! % REFERRAL_CODE_ALPHABET.length];
    }
    return code;
  }
}
