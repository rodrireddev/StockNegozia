import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import type { ProductDto } from "@stocknegozia/api-contracts";
import {
  activeUpdateSchema,
  createProductSchema,
  productQuerySchema,
  stockAdjustmentSchema,
  updateProductSchema,
  type ActiveUpdateInput,
  type CreateProductInput,
  type ProductQueryInput,
  type StockAdjustmentInput,
  type UpdateProductInput,
} from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  // @Inject explícito: la inyección automática por tipo de NestJS depende de metadata que `tsc`
  // emite pero esbuild (usado por Vitest) no — ver el mismo comentario en GlobalExceptionFilter.
  constructor(@Inject(ProductsService) private readonly productsService: ProductsService) {}

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

  /**
   * Ajuste manual de stock — API semántica: recibe el stock ABSOLUTO deseado, no un delta (ver
   * docs/inventory/STOCK_MOVEMENTS.md). Reemplaza a la antigua `PATCH /:id/stock`, que escribía
   * `products.stock` directamente sin generar historial — esa ruta ya no existe.
   */
  @Post(":id/stock-adjustments")
  adjustStock(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(stockAdjustmentSchema)) body: StockAdjustmentInput,
  ): ProductDto {
    return this.productsService.applyStockAdjustment(id, body.stock, body.reason);
  }

  @Patch(":id/active")
  updateActive(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(activeUpdateSchema)) body: ActiveUpdateInput,
  ): ProductDto {
    return this.productsService.updateActive(id, body.active);
  }
}
