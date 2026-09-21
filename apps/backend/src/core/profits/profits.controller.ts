import { Controller, Get, Inject, Query } from "@nestjs/common";
import type { DailyProfitDto, ProfitEntryDto } from "@stocknegozia/api-contracts";
import {
  dailyProfitQuerySchema,
  profitQuerySchema,
  type DailyProfitQueryInput,
  type ProfitQueryInput,
} from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ProfitsService } from "./profits.service";

/** Solo lectura: no hay ningún endpoint que modifique una ganancia — el dato sale de `sale_items`,
 *  inmutable una vez creado (ver `SalesModule`). */
@Controller("profits")
export class ProfitsController {
  constructor(@Inject(ProfitsService) private readonly profitsService: ProfitsService) {}

  @Get()
  findMany(
    @Query(new ZodValidationPipe(profitQuerySchema)) query: ProfitQueryInput,
  ): ProfitEntryDto[] {
    return this.profitsService.findMany(query);
  }

  @Get("daily")
  findDailySummary(
    @Query(new ZodValidationPipe(dailyProfitQuerySchema)) query: DailyProfitQueryInput,
  ): DailyProfitDto[] {
    return this.profitsService.findDailySummary(query.days);
  }
}
