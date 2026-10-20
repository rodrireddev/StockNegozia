import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ManagerDeviceGuard } from "../../auth/guards/manager-device.guard";
import type { SupplierDto } from "@stocknegozia/api-contracts";
import {
  createSupplierSchema,
  updateSupplierSchema,
  type CreateSupplierInput,
  type UpdateSupplierInput,
} from "@stocknegozia/validation";
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

  @UseGuards(ManagerDeviceGuard)
  @Post()
  create(
    @Body(new ZodValidationPipe(createSupplierSchema)) body: CreateSupplierInput,
  ): SupplierDto {
    return this.suppliersService.create(body);
  }

  @UseGuards(ManagerDeviceGuard)
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateSupplierSchema)) body: UpdateSupplierInput,
  ): SupplierDto {
    return this.suppliersService.update(id, body);
  }
}
