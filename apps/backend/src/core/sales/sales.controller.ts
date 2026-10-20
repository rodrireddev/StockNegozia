import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";
import { ManagerDeviceGuard } from "../../auth/guards/manager-device.guard";
import type { SaleDto, SaleSummaryDto } from "@stocknegozia/api-contracts";
import { createSaleSchema, type CreateSaleInput } from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { SalesService } from "./sales.service";

@Controller("sales")
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  findMany(
    @Query("customerId", new ParseIntPipe({ optional: true })) customerId?: number,
  ): SaleSummaryDto[] {
    return this.salesService.findMany(customerId);
  }

  @Get(":id")
  findById(@Param("id", ParseIntPipe) id: number): SaleDto {
    return this.salesService.findById(id);
  }

  /** Recibo PDF simplificado y no fiscal de la venta — generación opcional, disparada por el
   *  cliente (nunca automática al crear la venta). */
  @Get(":id/receipt")
  async downloadReceipt(@Param("id", ParseIntPipe) id: number): Promise<StreamableFile> {
    const buffer = await this.salesService.generateReceiptPdf(id);
    return new StreamableFile(buffer, {
      type: "application/pdf",
      disposition: `attachment; filename="recibo-venta-${id}.pdf"`,
    });
  }

  @Post()
  create(@Body(new ZodValidationPipe(createSaleSchema)) body: CreateSaleInput): SaleDto {
    return this.salesService.create(body);
  }

  @UseGuards(ManagerDeviceGuard)
  @Post(":id/cancel")
  cancel(@Param("id", ParseIntPipe) id: number): SaleDto {
    return this.salesService.cancel(id);
  }
}
