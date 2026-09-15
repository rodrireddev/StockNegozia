import { useQuery } from "@tanstack/react-query";
import { fetchSuppliers } from "@/api/endpoints/suppliers";

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
  });
}
