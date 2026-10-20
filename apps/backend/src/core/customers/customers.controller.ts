import { Body, Controller, Get, Inject, Param, ParseIntPipe, Patch, Post } from "@nestjs/common";
import type { CustomerAccountDto, CustomerDto } from "@stocknegozia/api-contracts";
import {
  createCustomerSchema,
  customerPaymentSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type CustomerPaymentInput,
  type UpdateCustomerInput,
} from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { CustomersService } from "./customers.service";

@Controller("customers")
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly customersService: CustomersService) {}

  @Get()
  findAll(): CustomerDto[] {
    return this.customersService.findAll();
  }

  @Get(":id")
  findById(@Param("id", ParseIntPipe) id: number): CustomerDto {
    return this.customersService.findById(id);
  }

  /** Cuenta corriente — abierto también a cajeros: cobrar el fiado es tarea de caja. */
  @Get(":id/account")
  getAccount(@Param("id", ParseIntPipe) id: number): CustomerAccountDto {
    return this.customersService.getAccount(id);
  }

  @Post(":id/payments")
  registerPayment(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(customerPaymentSchema)) body: CustomerPaymentInput,
  ): CustomerAccountDto {
    return this.customersService.registerPayment(id, body);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createCustomerSchema)) body: CreateCustomerInput,
  ): CustomerDto {
    return this.customersService.create(body);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateCustomerSchema)) body: UpdateCustomerInput,
  ): CustomerDto {
    return this.customersService.update(id, body);
  }
}
