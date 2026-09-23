import type { AccountAuthResult, AccountMeDto } from "@stocknegozia/api-contracts";
import type { AccountLoginInput, AccountRegisterInput } from "@stocknegozia/validation";
import { apiGet, apiPost } from "./client";

export function register(input: AccountRegisterInput): Promise<AccountAuthResult> {
  return apiPost<AccountAuthResult>("/accounts/register", input);
}

export function login(input: AccountLoginInput): Promise<AccountAuthResult> {
  return apiPost<AccountAuthResult>("/accounts/login", input);
}

export function getMe(): Promise<AccountMeDto> {
  return apiGet<AccountMeDto>("/accounts/me");
}
