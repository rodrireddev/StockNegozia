import { useMutation } from "@tanstack/react-query";
import { cancelPairing } from "../api/pairing.api";

export function useCancelPairing() {
  return useMutation({ mutationFn: cancelPairing });
}
