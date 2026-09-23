import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
import type { CashAdjustmentDto } from "@stocknegozia/api-contracts";
import {
  cashAdjustmentQuerySchema,
  createCashAdjustmentSchema,
  type CashAdjustmentQueryInput,
  type CreateCashAdjustmentInput,
} from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { CashAdjustmentsService } from "./cash-adjustments.service";

@Controller("cash-adjustments")
export class CashAdjustmentsController {
  constructor(@Inject(CashAdjustmentsService) private readonly cashAdjustmentsService: CashAdjustmentsService) {}

  @Get()
  findMany(
    @Query(new ZodValidationPipe(cashAdjustmentQuerySchema)) query: CashAdjustmentQueryInput,
  ): CashAdjustmentDto[] {
    return this.cashAdjustmentsService.findMany(query);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createCashAdjustmentSchema)) body: CreateCashAdjustmentInput,
  ): CashAdjustmentDto {
    return this.cashAdjustmentsService.create(body);
  }
}
