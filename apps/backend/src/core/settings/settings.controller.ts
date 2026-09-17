import { Body, Controller, Get, Inject, Patch } from "@nestjs/common";
import type { SettingsDto } from "@stocknegozia/api-contracts";
import { updateSettingsSchema, type UpdateSettingsInput } from "@stocknegozia/validation";
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
}
