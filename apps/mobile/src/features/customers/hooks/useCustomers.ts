import { useQuery } from "@tanstack/react-query";
import { fetchCustomers } from "@/api/endpoints/customers";

export function useCustomers() {
  return useQuery({ queryKey: ["customers"], queryFn: fetchCustomers });
}
