import { Inject, Injectable } from "@nestjs/common";
import type { AchievementDto } from "@stocknegozia/api-contracts";
import { ReferralsRepository } from "../accounts/referrals.repository";
import { UsersRepository } from "../accounts/users.repository";
import { AchievementClaimsRepository } from "./achievement-claims.repository";

/**
 * Agrega logros ya desbloqueados desde varias fuentes (setup quests + hitos de racha, ambos via
 * `achievement_claims` — panel admin, doc §7; referidos y Cofounder, sus propios flujos, sin
 * calendario configurable) — sin tabla nueva más allá de la unificada, pensada para mostrarse en
 * "Beneficios" (doc §3). Los labels ya no viven hardcodeados en código (`SETUP_QUEST_LABELS`/
 * `STREAK_MILESTONE_LABELS`): salen de `achievement_definitions`, editables desde el panel.
 *
 * No incluye `scheduled_goal` (objetivos programados) — esos se repiten por período y se muestran
 * en `GET /gamification/goals/active`, no como badge permanente acá. Tampoco niveles (Bronce/
 * Plata/Oro): esos todavía no tienen lógica de cálculo real (Etapa 2, doc §5).
 */
@Injectable()
export class AchievementsService {
  constructor(
    @Inject(AchievementClaimsRepository)
    private readonly achievementClaims: AchievementClaimsRepository,
    @Inject(ReferralsRepository) private readonly referrals: ReferralsRepository,
    @Inject(UsersRepository) private readonly users: UsersRepository,
  ) {}

  async listForUser(userId: string): Promise<AchievementDto[]> {
    const [claimRows, firstReferral, user] = await Promise.all([
      this.achievementClaims.findAllByUserWithDefinition(userId),
      this.referrals.findFirstValidatedByReferrer(userId),
      this.users.findById(userId),
    ]);

    const achievements: AchievementDto[] = [];

    for (const row of claimRows) {
      if (
        row.definition.category !== "setup_quest" &&
        row.definition.category !== "streak_milestone"
      )
        continue;
      achievements.push({
        key: row.definition.key,
        category: row.definition.category,
        label: row.definition.label,
        unlockedAt: row.claim.claimedAt.toISOString(),
      });
    }

    if (firstReferral?.validatedAt) {
      achievements.push({
        key: "referral.first_success",
        category: "referral",
        label: "Trajiste a alguien nuevo a StockNegozia",
        unlockedAt: firstReferral.validatedAt.toISOString(),
      });
    }

    if (user?.isCofounder) {
      // `createdAt` es una aproximación: todavía no existe el flujo de compra del Cofounder Pack
      // (doc §1, pendiente Google Play Billing), así que no hay un timestamp real de "cuándo se
      // hizo Cofounder" que trackear — se corrige solo apenas ese flujo exista.
      achievements.push({
        key: "cofounder",
        category: "cofounder",
        label: "Cofounder de StockNegozia",
        unlockedAt: user.createdAt.toISOString(),
      });
    }

    return achievements.sort((a, b) => a.unlockedAt.localeCompare(b.unlockedAt));
  }
}
