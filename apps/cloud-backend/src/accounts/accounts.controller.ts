import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type {
  AccountAuthResult,
  AccountMeDto,
  DevOnlyTokenResult,
} from "@stocknegozia/api-contracts";
import {
  accountLoginSchema,
  accountRegisterSchema,
  deleteAccountSchema,
  emailVerificationConfirmSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  type AccountLoginInput,
  type AccountRegisterInput,
  type DeleteAccountInput,
  type EmailVerificationConfirmInput,
  type PasswordResetConfirmInput,
  type PasswordResetRequestInput,
} from "@stocknegozia/validation";
import { AccountJwtGuard, type RequestWithAccount } from "./account-jwt.guard";
import { AccountsService } from "./accounts.service";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

/** IP del cliente (ya resuelta por Express vía `trust proxy`, ver `main.ts`) — para Turnstile y el
 *  rate-limit de login por IP. Mismo criterio que `RequestWithAccount`: interfaz mínima en vez de
 *  depender de los tipos de `express`. */
interface RequestWithIp {
  ip?: string;
}

@Controller("accounts")
export class AccountsController {
  constructor(@Inject(AccountsService) private readonly accountsService: AccountsService) {}

  @Post("register")
  register(
    @Body(new ZodValidationPipe(accountRegisterSchema)) body: AccountRegisterInput,
    @Req() request: RequestWithIp,
  ): Promise<AccountAuthResult> {
    return this.accountsService.register(body, request.ip);
  }

  @Post("login")
  login(
    @Body(new ZodValidationPipe(accountLoginSchema)) body: AccountLoginInput,
    @Req() request: RequestWithIp,
  ): Promise<AccountAuthResult> {
    return this.accountsService.login(body.email, body.password, request.ip, body.turnstileToken);
  }

  @UseGuards(AccountJwtGuard)
  @Get("me")
  me(@Req() request: RequestWithAccount): Promise<AccountMeDto> {
    return this.accountsService.me(request.account!.id);
  }

  /** Borrado de cuenta (política de Google Play) — irreversible, pide contraseña de nuevo. */
  @UseGuards(AccountJwtGuard)
  @Delete("me")
  @HttpCode(204)
  deleteMe(
    @Req() request: RequestWithAccount,
    @Body(new ZodValidationPipe(deleteAccountSchema)) body: DeleteAccountInput,
  ): Promise<void> {
    return this.accountsService.deleteAccount(request.account!.id, body.password);
  }

  @UseGuards(AccountJwtGuard)
  @Post("verify-email/resend")
  resendVerificationEmail(@Req() request: RequestWithAccount): Promise<DevOnlyTokenResult> {
    return this.accountsService.resendVerificationEmail(request.account!.id);
  }

  // Público a propósito: el token en sí (mandado por mail) es la autenticación de esta acción,
  // no hace falta que el dispositivo tenga la sesión activa que lo pidió.
  @Post("verify-email/confirm")
  confirmEmail(
    @Body(new ZodValidationPipe(emailVerificationConfirmSchema))
    body: EmailVerificationConfirmInput,
  ): Promise<AccountMeDto> {
    return this.accountsService.confirmEmail(body.token);
  }

  @Post("password-reset/request")
  requestPasswordReset(
    @Body(new ZodValidationPipe(passwordResetRequestSchema)) body: PasswordResetRequestInput,
    @Req() request: RequestWithIp,
  ): Promise<DevOnlyTokenResult> {
    return this.accountsService.requestPasswordReset(body.email, body.turnstileToken, request.ip);
  }

  @Post("password-reset/confirm")
  confirmPasswordReset(
    @Body(new ZodValidationPipe(passwordResetConfirmSchema)) body: PasswordResetConfirmInput,
  ): Promise<AccountAuthResult> {
    return this.accountsService.confirmPasswordReset(body.token, body.newPassword);
  }
}
