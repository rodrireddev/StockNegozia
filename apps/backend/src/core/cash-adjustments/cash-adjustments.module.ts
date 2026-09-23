import { Module } from "@nestjs/common";
import { CashAdjustmentsController } from "./cash-adjustments.controller";
import { CashAdjustmentsRepository } from "./cash-adjustments.repository";
import { CashAdjustmentsService } from "./cash-adjustments.service";

/** Retiros/ingresos de caja — ver `CashAdjustmentsRepository` para el detalle. Exportado para que
 *  `ProfitsModule` pueda consultarlo (solo lectura) y armar el historial combinado. */
@Module({
  controllers: [CashAdjustmentsController],
  providers: [CashAdjustmentsRepository, CashAdjustmentsService],
  exports: [CashAdjustmentsService],
})
export class CashAdjustmentsModule {}
