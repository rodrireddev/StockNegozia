import { Controller, Inject, Post, Req, UseGuards } from "@nestjs/common";
import type { RecordActivityResult } from "@stocknegozia/api-contracts";
import { AccountJwtGuard, type RequestWithAccount } from "../accounts/account-jwt.guard";
import { StreakService } from "./streak.service";

@Controller("gamification")
@UseGuards(AccountJwtGuard)
export class GamificationController {
  constructor(@Inject(StreakService) private readonly streakService: StreakService) {}

  /** El cliente llama esto cuando el usuario hace algo real (venta o movimiento de stock, doc §2). */
  @Post("activity")
  recordActivity(@Req() request: RequestWithAccount): Promise<RecordActivityResult> {
    return this.streakService.recordActivity(request.account!.id);
  }
}
