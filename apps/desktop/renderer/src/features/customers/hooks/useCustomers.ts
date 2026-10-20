import type { CreateCustomerInput, CustomerPaymentInput } from "@stocknegozia/validation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCustomer,
  fetchCustomerAccount,
  fetchCustomers,
  registerCustomerPayment,
  updateCustomer,
} from "../api/customers.api";

export function useCustomers() {
  return useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
}

/** Crea si `id` es `null`, edita si no. */
export function useSaveCustomer(id: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerInput) =>
      id === null ? createCustomer(input) : updateCustomer(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useCustomerAccount(id: number | null) {
  return useQuery({
    queryKey: ["customers", id, "account"],
    queryFn: () => fetchCustomerAccount(id!),
    enabled: id !== null,
  });
}

export function useRegisterCustomerPayment(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerPaymentInput) => registerCustomerPayment(id, input),
    onSuccess: () => {
      // Saldo de clientes y "Fiado a cobrar" de Finanzas.
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      void queryClient.invalidateQueries({ queryKey: ["profits"] });
    },
  });
}
