import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaymentTermsInput } from "@stocknegozia/validation";
import { fetchPaymentTerms, updatePaymentTerms } from "@/api/endpoints/settings";

/** Condiciones de cobro (recargos, comisiones, acreditación) — ver `PaymentTermsDto`. */
export function usePaymentTerms() {
  return useQuery({ queryKey: ["payment-terms"], queryFn: fetchPaymentTerms });
}

export function useUpdatePaymentTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PaymentTermsInput) => updatePaymentTerms(input),
    onSuccess: (terms) => queryClient.setQueryData(["payment-terms"], terms),
  });
}
