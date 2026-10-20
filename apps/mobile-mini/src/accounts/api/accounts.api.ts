import type {
  AccountAuthResult,
  AccountMeDto,
  DevOnlyTokenResult,
} from "@stocknegozia/api-contracts";
import type {
  AccountLoginInput,
  AccountRegisterInput,
  DeleteAccountInput,
  EmailVerificationConfirmInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
} from "@stocknegozia/validation";
import { apiDelete, apiGet, apiPost } from "./client";

export function register(input: AccountRegisterInput): Promise<AccountAuthResult> {
  return apiPost<AccountAuthResult>("/accounts/register", input);
}

export function login(input: AccountLoginInput): Promise<AccountAuthResult> {
  return apiPost<AccountAuthResult>("/accounts/login", input);
}

export function getMe(): Promise<AccountMeDto> {
  return apiGet<AccountMeDto>("/accounts/me");
}

export function resendVerificationEmail(): Promise<DevOnlyTokenResult> {
  return apiPost<DevOnlyTokenResult>("/accounts/verify-email/resend");
}

export function confirmEmail(input: EmailVerificationConfirmInput): Promise<AccountMeDto> {
  return apiPost<AccountMeDto>("/accounts/verify-email/confirm", input);
}

export function requestPasswordReset(
  input: PasswordResetRequestInput,
): Promise<DevOnlyTokenResult> {
  return apiPost<DevOnlyTokenResult>("/accounts/password-reset/request", input);
}

export function confirmPasswordReset(input: PasswordResetConfirmInput): Promise<AccountAuthResult> {
  return apiPost<AccountAuthResult>("/accounts/password-reset/confirm", input);
}

/** Borrado de cuenta (política de Google Play) — irreversible, pide la contraseña de nuevo. */
export function deleteAccount(input: DeleteAccountInput): Promise<void> {
  return apiDelete<void>("/accounts/me", input);
}
