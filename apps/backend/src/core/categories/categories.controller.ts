import { Controller, Get } from "@nestjs/common";
import type { CategoryDto } from "@stocknegozia/api-contracts";
import { CategoriesService } from "./categories.service";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(): CategoryDto[] {
    return this.categoriesService.findAll();
  }
}
