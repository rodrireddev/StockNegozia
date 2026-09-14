import { Injectable } from "@nestjs/common";
import type { CategoryDto } from "@stocknegozia/api-contracts";
import { CategoriesRepository } from "./categories.repository";

@Injectable()
export class CategoriesService {
  constructor(private readonly repository: CategoriesRepository) {}

  findAll(): CategoryDto[] {
    return this.repository.findAll().map((category) => ({
      id: category.id,
      name: category.name,
    }));
  }

  /** Punto único usado por Productos para resolver una categoría a partir de su nombre. */
  findOrCreateByName(name: string): CategoryDto {
    const existing = this.repository.findByName(name);
    if (existing) {
      return { id: existing.id, name: existing.name };
    }
    const created = this.repository.insert(name);
    return { id: created.id, name: created.name };
  }
}
