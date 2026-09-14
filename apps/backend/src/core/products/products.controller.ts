import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import type { ProductDto } from "@stocknegozia/api-contracts";
import {
  activeUpdateSchema,
  createProductSchema,
  productQuerySchema,
  stockUpdateSchema,
  updateProductSchema,
  type ActiveUpdateInput,
  type CreateProductInput,
  type ProductQueryInput,
  type StockUpdateInput,
  type UpdateProductInput,
} from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findMany(
    @Query(new ZodValidationPipe(productQuerySchema)) query: ProductQueryInput,
  ): ProductDto[] {
    return this.productsService.findMany(query);
  }

  @Get(":id")
  findById(@Param("id", ParseIntPipe) id: number): ProductDto {
    return this.productsService.findById(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createProductSchema)) body: CreateProductInput): ProductDto {
    return this.productsService.create(body);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductInput,
  ): ProductDto {
    return this.productsService.update(id, body);
  }

  @Patch(":id/stock")
  updateStock(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(stockUpdateSchema)) body: StockUpdateInput,
  ): ProductDto {
    return this.productsService.updateStock(id, body.stock);
  }

  @Patch(":id/active")
  updateActive(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(activeUpdateSchema)) body: ActiveUpdateInput,
  ): ProductDto {
    return this.productsService.updateActive(id, body.active);
  }
}
