import { useQuery } from "@tanstack/react-query";
import { fetchSuppliers } from "../api/suppliers.api";

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
  });
}
