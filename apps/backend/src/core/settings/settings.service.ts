import { Injectable } from "@nestjs/common";
import type { PaymentTermsDto, SettingsDto } from "@stocknegozia/api-contracts";
import { DEFAULT_PAYMENT_TERMS } from "@stocknegozia/shared";
import {
  paymentTermsSchema,
  type PaymentTermsInput,
  type UpdateSettingsInput,
} from "@stocknegozia/validation";
import { SettingsRepository } from "./settings.repository";

@Injectable()
export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  get(): SettingsDto {
    return { businessName: this.repository.getBusinessName() };
  }

  update(input: UpdateSettingsInput): SettingsDto {
    this.repository.setBusinessName(input.businessName);
    return this.get();
  }

  /**
   * Condiciones de cobro (recargos, comisiones, acreditación) — las configuradas, o las de por
   * defecto si nunca se guardaron o el JSON guardado ya no es válido (nunca rompe una venta).
   */
  getPaymentTerms(): PaymentTermsDto {
    const json = this.repository.getPaymentTermsJson();
    if (!json) return DEFAULT_PAYMENT_TERMS;
    try {
      const parsed = paymentTermsSchema.safeParse(JSON.parse(json));
      return parsed.success ? parsed.data : DEFAULT_PAYMENT_TERMS;
    } catch {
      return DEFAULT_PAYMENT_TERMS;
    }
  }

  updatePaymentTerms(input: PaymentTermsInput): PaymentTermsDto {
    this.repository.setPaymentTermsJson(JSON.stringify(input));
    return this.getPaymentTerms();
  }
}
