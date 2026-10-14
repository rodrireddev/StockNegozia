import { Body, Controller, Get, Inject, Patch, Put } from "@nestjs/common";
import type { PaymentTermsDto, SettingsDto } from "@stocknegozia/api-contracts";
import {
  paymentTermsSchema,
  updateSettingsSchema,
  type PaymentTermsInput,
  type UpdateSettingsInput,
} from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { SettingsService } from "./settings.service";

@Controller("settings")
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get()
  get(): SettingsDto {
    return this.settingsService.get();
  }

  @Patch()
  update(
    @Body(new ZodValidationPipe(updateSettingsSchema)) body: UpdateSettingsInput,
  ): SettingsDto {
    return this.settingsService.update(body);
  }

  /** Recargos, comisiones y plazos de acreditación por medio de pago / plan de cuotas. */
  @Get("payment-terms")
  getPaymentTerms(): PaymentTermsDto {
    return this.settingsService.getPaymentTerms();
  }

  @Put("payment-terms")
  updatePaymentTerms(
    @Body(new ZodValidationPipe(paymentTermsSchema)) body: PaymentTermsInput,
  ): PaymentTermsDto {
    return this.settingsService.updatePaymentTerms(body);
  }
}
