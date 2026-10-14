import { Module } from "@nestjs/common";
import { ProfitsController } from "./profits.controller";
import { ProfitsRepository } from "./profits.repository";
import { ProfitsService } from "./profits.service";

/** Ganancia por línea de venta (`GET /profits`) — ver `ProfitsRepository` para el join que arma
 *  cada línea. Sin ajustes de caja: esos viven en `CashAdjustmentsModule` y se resumen aparte en
 *  `FinanceModule`. */
@Module({
  controllers: [ProfitsController],
  providers: [ProfitsRepository, ProfitsService],
})
export class ProfitsModule {}
