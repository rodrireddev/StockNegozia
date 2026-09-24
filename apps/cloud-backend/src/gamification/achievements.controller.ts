import { Controller, Get, Inject, Req, UseGuards } from "@nestjs/common";
import type { AchievementDto } from "@stocknegozia/api-contracts";
import { AccountJwtGuard, type RequestWithAccount } from "../accounts/account-jwt.guard";
import { AchievementsService } from "./achievements.service";

/** Vive en `/accounts` (no `/gamification`): son parte del perfil de la cuenta, doc §3. */
@Controller("accounts/me/achievements")
@UseGuards(AccountJwtGuard)
export class AchievementsController {
  constructor(@Inject(AchievementsService) private readonly achievementsService: AchievementsService) {}

  @Get()
  list(@Req() request: RequestWithAccount): Promise<AchievementDto[]> {
    return this.achievementsService.listForUser(request.account!.id);
  }
}
