import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/data/categories";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
}
