import type { CreateProductInput } from "@stocknegozia/validation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "@/accounts/AccountContext";
import { createProduct } from "@/data/products";
import { fireSetupQuestClaim } from "@/features/benefits/gamificationTriggers";

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { status } = useAccount();
  return useMutation({
    mutationFn: (input: CreateProductInput) => createProduct(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      // Idempotente en el backend — no hace falta saber si es "el primero" acá (doc §1).
      if (status === "authenticated") fireSetupQuestClaim("first_product");
    },
  });
}
