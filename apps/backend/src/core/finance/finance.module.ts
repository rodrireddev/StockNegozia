import { Module } from "@nestjs/common";
import { CashAdjustmentsModule } from "../cash-adjustments/cash-adjustments.module";
import { FinanceController } from "./finance.controller";
import { FinanceRepository } from "./finance.repository";
import { FinanceService } from "./finance.service";

@Module({
  imports: [CashAdjustmentsModule],
  controllers: [FinanceController],
  providers: [FinanceRepository, FinanceService],
})
export class FinanceModule {}
