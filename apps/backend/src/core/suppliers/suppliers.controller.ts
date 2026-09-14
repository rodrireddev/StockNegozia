import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post } from "@nestjs/common";
import type { SupplierDto } from "@stocknegozia/api-contracts";
import { createSupplierSchema, type CreateSupplierInput } from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { SuppliersService } from "./suppliers.service";

@Controller("suppliers")
export class SuppliersController {
  // @Inject explícito: la inyección automática por tipo de NestJS depende de metadata que `tsc`
  // emite pero esbuild (usado por Vitest) no — ver el mismo comentario en GlobalExceptionFilter.
  constructor(@Inject(SuppliersService) private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(): SupplierDto[] {
    return this.suppliersService.findAll();
  }

  @Get(":id")
  findById(@Param("id", ParseIntPipe) id: number): SupplierDto {
    return this.suppliersService.findById(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createSupplierSchema)) body: CreateSupplierInput,
  ): SupplierDto {
    return this.suppliersService.create(body);
  }
}
