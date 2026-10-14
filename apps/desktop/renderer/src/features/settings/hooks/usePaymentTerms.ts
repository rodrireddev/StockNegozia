import type { PaymentTermsInput } from "@stocknegozia/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPaymentTerms, updatePaymentTerms } from "../api/settings.api";

/** Condiciones de cobro (recargos, comisiones, acreditación) — ver `PaymentTermsDto`. */
export function usePaymentTerms() {
  return useQuery({ queryKey: ["settings", "payment-terms"], queryFn: fetchPaymentTerms });
}

export function useUpdatePaymentTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentTermsInput) => updatePaymentTerms(input),
    onSuccess: (terms) => queryClient.setQueryData(["settings", "payment-terms"], terms),
  });
}
