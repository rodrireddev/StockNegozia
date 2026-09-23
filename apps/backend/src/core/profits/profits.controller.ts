import { Controller, Get, Inject, Query } from "@nestjs/common";
import type {
  DailyProfitDto,
  HourlyProfitDto,
  ProfitEntryDto,
  ProfitLedgerEntryDto,
} from "@stocknegozia/api-contracts";
import {
  dailyProfitQuerySchema,
  hourlyProfitQuerySchema,
  profitQuerySchema,
  type DailyProfitQueryInput,
  type HourlyProfitQueryInput,
  type ProfitQueryInput,
} from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ProfitsService } from "./profits.service";

/** Solo lectura: no hay ningún endpoint que modifique una ganancia — el dato sale de `sale_items`
 *  (inmutable una vez creado, ver `SalesModule`) y de `cash_adjustments` (ver
 *  `CashAdjustmentsModule`, que es quien expone su propio alta). */
@Controller("profits")
export class ProfitsController {
  constructor(@Inject(ProfitsService) private readonly profitsService: ProfitsService) {}

  @Get()
  findMany(
    @Query(new ZodValidationPipe(profitQuerySchema)) query: ProfitQueryInput,
  ): ProfitEntryDto[] {
    return this.profitsService.findMany(query);
  }

  /** Historial combinado (ventas + ajustes de caja) — lo que efectivamente muestra "Historial" en
   *  la pantalla de Ganancias. */
  @Get("ledger")
  findLedger(
    @Query(new ZodValidationPipe(profitQuerySchema)) query: ProfitQueryInput,
  ): ProfitLedgerEntryDto[] {
    return this.profitsService.findLedger(query);
  }

  @Get("daily")
  findDailySummary(
    @Query(new ZodValidationPipe(dailyProfitQuerySchema)) query: DailyProfitQueryInput,
  ): DailyProfitDto[] {
    return this.profitsService.findDailySummary(query.days);
  }

  @Get("hourly")
  findHourlySummary(
    @Query(new ZodValidationPipe(hourlyProfitQuerySchema)) query: HourlyProfitQueryInput,
  ): HourlyProfitDto[] {
    return this.profitsService.findHourlySummary(query.date);
  }
}
