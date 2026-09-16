import type { CategoryDto } from "@stocknegozia/api-contracts";
import { categoriesService } from "@/features/categories/data/service";

export async function fetchCategories(): Promise<CategoryDto[]> {
  return categoriesService.findAll();
}
