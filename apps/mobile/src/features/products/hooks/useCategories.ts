import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/api/endpoints/categories";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
}
