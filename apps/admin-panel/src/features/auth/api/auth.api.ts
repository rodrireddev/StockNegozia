import type { AdminLoginResult } from "@stocknegozia/api-contracts";
import type { AdminLoginInput } from "@stocknegozia/validation";
import { apiPost } from "@/lib/api-client";

export function login(input: AdminLoginInput): Promise<AdminLoginResult> {
  return apiPost<AdminLoginResult>("/admin/auth/login", input);
}
