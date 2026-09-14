import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import type { SaleDto, SaleSummaryDto } from "@stocknegozia/api-contracts";
import { createSaleSchema, type CreateSaleInput } from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { SalesService } from "./sales.service";

@Controller("sales")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findMany(): SaleSummaryDto[] {
    return this.salesService.findMany();
  }

  @Get(":id")
  findById(@Param("id", ParseIntPipe) id: number): SaleDto {
    return this.salesService.findById(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createSaleSchema)) body: CreateSaleInput): SaleDto {
    return this.salesService.create(body);
  }

  @Post(":id/cancel")
  cancel(@Param("id", ParseIntPipe) id: number): SaleDto {
    return this.salesService.cancel(id);
  }
}
