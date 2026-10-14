import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post, Query } from "@nestjs/common";
import type { PurchaseDto, PurchaseSummaryDto } from "@stocknegozia/api-contracts";
import {
  createPurchaseSchema,
  purchaseQuerySchema,
  type CreatePurchaseInput,
  type PurchaseQueryInput,
} from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { PurchasesService } from "./purchases.service";

@Controller("purchases")
export class PurchasesController {
  // @Inject explícito: la inyección automática por tipo de NestJS depende de metadata que `tsc`
  // emite pero esbuild (usado por Vitest) no — ver el mismo comentario en GlobalExceptionFilter.
  constructor(@Inject(PurchasesService) private readonly purchasesService: PurchasesService) {}

  @Get()
  findMany(
    @Query(new ZodValidationPipe(purchaseQuerySchema)) query: PurchaseQueryInput,
  ): PurchaseSummaryDto[] {
    return this.purchasesService.findMany(query);
  }

  @Get(":id")
  findById(@Param("id", ParseIntPipe) id: number): PurchaseDto {
    return this.purchasesService.findById(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createPurchaseSchema)) body: CreatePurchaseInput,
  ): PurchaseDto {
    return this.purchasesService.create(body);
  }
}
