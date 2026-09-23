import { useMutation } from "@tanstack/react-query";
import type { AdminLoginInput } from "@stocknegozia/validation";
import { useAuthStore } from "@/stores/auth-store";
import { login } from "../api/auth.api";

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (input: AdminLoginInput) => login(input),
    onSuccess: (result, input) => {
      setSession({ accessToken: result.accessToken, email: input.email, expiresAt: result.expiresAt });
    },
  });
}
