import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import type { ConfirmPairingInput } from "@/api/endpoints/auth";

export function usePairDevice() {
  const { pair } = useAuth();

  return useMutation({
    mutationFn: (input: ConfirmPairingInput) => pair(input),
  });
}
