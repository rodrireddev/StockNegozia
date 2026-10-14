import { Controller, Get, Inject, Query } from "@nestjs/common";
import type { ProfitEntryDto } from "@stocknegozia/api-contracts";
import { profitQuerySchema, type ProfitQueryInput } from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { ProfitsService } from "./profits.service";

/**
 * Ganancia por línea de venta — sólo lectura y SÓLO ventas: los retiros/ingresos de caja nunca se
 * mezclan acá (tienen su propio endpoint, `GET /cash-adjustments`). Totales, series y cobros del
 * período: `GET /finance/*` (ver `FinanceController`).
 */
@Controller("profits")
export class ProfitsController {
  constructor(@Inject(ProfitsService) private readonly profitsService: ProfitsService) {}

  @Get()
  findMany(
    @Query(new ZodValidationPipe(profitQuerySchema)) query: ProfitQueryInput,
  ): ProfitEntryDto[] {
    return this.profitsService.findMany(query);
  }
}
