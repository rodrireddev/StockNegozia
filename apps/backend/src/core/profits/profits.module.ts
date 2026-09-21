import { Module } from "@nestjs/common";
import { ProfitsController } from "./profits.controller";
import { ProfitsRepository } from "./profits.repository";
import { ProfitsService } from "./profits.service";

/** Ganancias por venta — ver `ProfitsRepository` para el join que arma cada línea. */
@Module({
  controllers: [ProfitsController],
  providers: [ProfitsRepository, ProfitsService],
})
export class ProfitsModule {}
