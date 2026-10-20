import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { ManagerDeviceGuard } from "../../auth/guards/manager-device.guard";
import type { FinanceSummaryDto, SettlementDto, TopProductDto } from "@stocknegozia/api-contracts";
import {
  financeRangeQuerySchema,
  settlementsQuerySchema,
  topProductsQuerySchema,
  type FinanceRangeQueryInput,
  type SettlementsQueryInput,
  type TopProductsQueryInput,
} from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { FinanceService } from "./finance.service";

/** Vistas de Finanzas ("Ganancias") — sólo lectura. Ventas por línea: `GET /profits`; compras:
 *  `GET /purchases?from&to`; caja: `GET /cash-adjustments?from&to`. */
@UseGuards(ManagerDeviceGuard)
@Controller("finance")
export class FinanceController {
  constructor(@Inject(FinanceService) private readonly financeService: FinanceService) {}

  @Get("summary")
  getSummary(
    @Query(new ZodValidationPipe(financeRangeQuerySchema)) query: FinanceRangeQueryInput,
  ): FinanceSummaryDto {
    return this.financeService.getSummary(query);
  }

  @Get("top-products")
  getTopProducts(
    @Query(new ZodValidationPipe(topProductsQuerySchema)) query: TopProductsQueryInput,
  ): TopProductDto[] {
    return this.financeService.getTopProducts(query);
  }

  @Get("settlements")
  getSettlements(
    @Query(new ZodValidationPipe(settlementsQuerySchema)) query: SettlementsQueryInput,
  ): SettlementDto[] {
    return this.financeService.getSettlements(query);
  }
}
