import { useMutation } from "@tanstack/react-query";
import { createPairing } from "../api/pairing.api";

export function useCreatePairing() {
  return useMutation({ mutationFn: createPairing });
}
