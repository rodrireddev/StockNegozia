import type { CategoryDto } from "@stocknegozia/api-contracts";
import { apiGet } from "@/lib/api-client";

export function fetchCategories(): Promise<CategoryDto[]> {
  return apiGet<CategoryDto[]>("/categories");
}
