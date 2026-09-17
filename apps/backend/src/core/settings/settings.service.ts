import { Injectable } from "@nestjs/common";
import type { SettingsDto } from "@stocknegozia/api-contracts";
import type { UpdateSettingsInput } from "@stocknegozia/validation";
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
}
