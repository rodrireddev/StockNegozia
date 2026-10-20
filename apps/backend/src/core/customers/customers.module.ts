import { Module } from "@nestjs/common";
import { CustomersController } from "./customers.controller";
import { CustomersRepository } from "./customers.repository";
import { CustomersService } from "./customers.service";

/** Exporta `CustomersService` para que `SalesModule` valide el cliente al crear una venta. */
@Module({
  controllers: [CustomersController],
  providers: [CustomersService, CustomersRepository],
  exports: [CustomersService],
})
export class CustomersModule {}
