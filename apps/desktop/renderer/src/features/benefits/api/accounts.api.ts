import type { AccountAuthResult, AccountMeDto } from "@stocknegozia/api-contracts";
import type { AccountLoginInput, AccountRegisterInput } from "@stocknegozia/validation";
import { cloudApiGet, cloudApiPost } from "@/lib/cloud-api-client";

export function register(input: AccountRegisterInput): Promise<AccountAuthResult> {
  return cloudApiPost<AccountAuthResult>("/accounts/register", input);
}

export function login(input: AccountLoginInput): Promise<AccountAuthResult> {
  return cloudApiPost<AccountAuthResult>("/accounts/login", input);
}

export function getMe(): Promise<AccountMeDto> {
  return cloudApiGet<AccountMeDto>("/accounts/me");
}
