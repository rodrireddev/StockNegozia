import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import type { AccountAuthResult, AccountMeDto } from "@stocknegozia/api-contracts";
import { randomBytes, randomUUID } from "node:crypto";
import { EmailService } from "../common/email.service";
import { PasswordService } from "../common/password.service";
import { appConfig } from "../config/configuration";
import { CreditConfigService } from "../credit-config/credit-config.service";
import { CreditsService } from "../credits/credits.service";
import { AccountJwtService } from "./account-jwt.service";
import { AccountTokensService } from "./account-tokens.service";
import { ReferralsRepository } from "./referrals.repository";
import { UsersRepository } from "./users.repository";

const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I, se confunden al leerlo en voz alta
const REFERRAL_CODE_LENGTH = 8;

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
// Más corto que el de verificación: reset de contraseña es la acción más sensible de las dos.
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AccountsService {
  // @Inject explícito en todos los parámetros — mismo motivo que en apps/backend (esbuild/Vitest
  // no emite la metadata de tipos que la inyección automática de NestJS necesita).
  constructor(
    @Inject(UsersRepository) private readonly usersRepository: UsersRepository,
    @Inject(ReferralsRepository) private readonly referralsRepository: ReferralsRepository,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(AccountJwtService) private readonly accountJwtService: AccountJwtService,
    @Inject(CreditsService) private readonly creditsService: CreditsService,
    @Inject(CreditConfigService) private readonly creditConfigService: CreditConfigService,
    @Inject(AccountTokensService) private readonly accountTokensService: AccountTokensService,
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(ConfigService) private readonly configService: ConfigService,
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

    // No bloquea el registro si falla — confirmar el email nunca es requisito para usar la cuenta
    // (doc "nunca bloquea nada, en ningún nivel"). El usuario puede reenviarlo después.
    await this.sendVerificationEmail(user.id, user.email!).catch(() => {});

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
      emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    };
  }

  /**
   * `DELETE /accounts/me` — borrado de cuenta (política de Google Play, doc de políticas): borra
   * al usuario y absolutamente todo lo que le pertenece (`UsersRepository.deleteAccountAndAllData`,
   * una sola transacción). Irreversible — de ahí pedir la contraseña de nuevo, no alcanza con el
   * JWT de la sesión activa.
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.usersRepository.findById(userId);
    if (!user || !user.passwordHash || !this.passwordService.verify(password, user.passwordHash)) {
      throw new UnauthorizedException("Contraseña incorrecta");
    }
    await this.usersRepository.deleteAccountAndAllData(userId);
  }

  /** `POST /accounts/verify-email/resend` — por si el mail automático del registro no llegó. */
  async resendVerificationEmail(userId: string): Promise<{ devToken?: string }> {
    const user = await this.usersRepository.findById(userId);
    if (!user || !user.email) throw new UnauthorizedException("Cuenta no encontrada");
    if (user.emailVerifiedAt) return {};

    return this.sendVerificationEmail(user.id, user.email);
  }

  /** `POST /accounts/verify-email/confirm` — público: el token en sí es la autenticación. */
  async confirmEmail(rawToken: string): Promise<AccountMeDto> {
    const userId = await this.accountTokensService.consume(rawToken, "email_verification");
    await this.usersRepository.markEmailVerified(userId);
    return this.me(userId);
  }

  /**
   * `POST /accounts/password-reset/request` — SIEMPRE responde igual, exista o no el email
   * (anti-enumeración, mismo criterio que `ApiAccessGuard` de apps/backend: nunca revelar si una
   * cuenta existe a partir de la respuesta).
   */
  async requestPasswordReset(email: string): Promise<{ devToken?: string }> {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) return {};

    const rawToken = await this.accountTokensService.issue(user.id, "password_reset", PASSWORD_RESET_TTL_MS);
    await this.emailService.send({
      to: email,
      subject: "Recuperar tu contraseña de StockNegozia",
      body: `Usá este código para elegir una contraseña nueva (vence en 1 hora): ${rawToken}`,
    });
    return this.isDev() ? { devToken: rawToken } : {};
  }

  /** `POST /accounts/password-reset/confirm` — deja logueado con la contraseña nueva. */
  async confirmPasswordReset(rawToken: string, newPassword: string): Promise<AccountAuthResult> {
    const userId = await this.accountTokensService.consume(rawToken, "password_reset");
    await this.usersRepository.updatePasswordHash(userId, this.passwordService.hash(newPassword));

    const user = await this.usersRepository.findById(userId);
    return this.issueToken(userId, user!.email!);
  }

  private async sendVerificationEmail(userId: string, email: string): Promise<{ devToken?: string }> {
    const rawToken = await this.accountTokensService.issue(userId, "email_verification", EMAIL_VERIFICATION_TTL_MS);
    await this.emailService.send({
      to: email,
      subject: "Confirmá tu email de StockNegozia",
      body: `Usá este código para confirmar tu cuenta (vence en 24 horas): ${rawToken}`,
    });
    return this.isDev() ? { devToken: rawToken } : {};
  }

  /** Sin proveedor de email real todavía (ver doc) — en dev/test se devuelve el token en la
   *  respuesta para poder probar el flujo completo sin leer logs del servidor. */
  private isDev(): boolean {
    const config = this.configService.get<ConfigType<typeof appConfig>>("app")!;
    return config.nodeEnv !== "production";
  }

  private issueToken(userId: string, email: string): Promise<AccountAuthResult> {
    return this.accountJwtService.sign({ sub: userId, email });
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
