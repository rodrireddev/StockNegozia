import { Module } from "@nestjs/common";
import { CashAdjustmentsModule } from "../cash-adjustments/cash-adjustments.module";
import { ProfitsController } from "./profits.controller";
import { ProfitsRepository } from "./profits.repository";
import { ProfitsService } from "./profits.service";

/** Ganancias por venta — ver `ProfitsRepository` para el join que arma cada línea. Importa
 *  `CashAdjustmentsModule` para combinar los ajustes de caja en el historial/gráficos, ver
 *  `ProfitsService`. */
@Module({
  imports: [CashAdjustmentsModule],
  controllers: [ProfitsController],
  providers: [ProfitsRepository, ProfitsService],
})
export class ProfitsModule {}
