import type { CategoryDto } from "@stocknegozia/api-contracts";
import type { DrizzleExecutor } from "@/database/database.types";
import { categoriesRepository } from "./repository";

/** Mismas reglas que `apps/backend/src/core/categories/categories.service.ts`: sin update/delete,
 *  `findOrCreateByName` es el único punto de resolución usado por Productos. */
export const categoriesService = {
  findAll(): CategoryDto[] {
    return categoriesRepository.findAll().map((category) => ({
      id: category.id,
      name: category.name,
    }));
  },

  findOrCreateByName(name: string, executor?: DrizzleExecutor): CategoryDto {
    const existing = categoriesRepository.findByName(name, executor);
    if (existing) return { id: existing.id, name: existing.name };
    const created = categoriesRepository.insert(name, executor);
    return { id: created.id, name: created.name };
  },
};
