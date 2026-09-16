import { useQuery } from "@tanstack/react-query";
import { fetchSuppliers } from "@/data/suppliers";

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
  });
}
