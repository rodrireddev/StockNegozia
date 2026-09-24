import { Inject, Injectable } from "@nestjs/common";
import type { AchievementDto } from "@stocknegozia/api-contracts";
import { ReferralsRepository } from "../accounts/referrals.repository";
import { UsersRepository } from "../accounts/users.repository";
import { SetupQuestCompletionsRepository } from "./setup-quest-completions.repository";
import { StreakMilestoneClaimsRepository } from "./streak-milestone-claims.repository";

/**
 * Catálogo de etiquetas en código, no en DB — a diferencia de `credit_config_items`, esto no es
 * un número que un admin ajuste desde el panel, es texto de producto. Agregar un logro nuevo es
 * agregar una entrada acá, nunca una migración.
 */
const SETUP_QUEST_LABELS: Record<string, string> = {
  first_product: "Cargaste tu primer producto",
  first_sale: "Registraste tu primera venta",
  first_scan: "Escaneaste tu primer código",
  profile_complete: "Completaste tu perfil",
};

const STREAK_MILESTONE_LABELS: Record<number, string> = {
  3: "3 días seguidos usando StockNegozia",
  7: "1 semana seguida usando StockNegozia",
  14: "2 semanas seguidas usando StockNegozia",
  30: "1 mes seguido usando StockNegozia",
};

/**
 * Agrega logros ya desbloqueados desde varias tablas (setup quests, hitos de racha, referidos,
 * Cofounder) — sin tabla nueva, esto es una vista de lo que ya se trackea, pensada para mostrarse
 * en "Beneficios" (doc §3). No incluye niveles (Bronce/Plata/Oro): esos todavía no tienen lógica
 * de cálculo real (Etapa 2, doc §5) — listarlos como "logro" sin que nada los otorgue de verdad
 * confundiría más de lo que suma.
 */
@Injectable()
export class AchievementsService {
  constructor(
    @Inject(SetupQuestCompletionsRepository) private readonly setupQuests: SetupQuestCompletionsRepository,
    @Inject(StreakMilestoneClaimsRepository) private readonly streakMilestones: StreakMilestoneClaimsRepository,
    @Inject(ReferralsRepository) private readonly referrals: ReferralsRepository,
    @Inject(UsersRepository) private readonly users: UsersRepository,
  ) {}

  async listForUser(userId: string): Promise<AchievementDto[]> {
    const [questRows, milestoneRows, firstReferral, user] = await Promise.all([
      this.setupQuests.findAllByUser(userId),
      this.streakMilestones.findAllByUser(userId),
      this.referrals.findFirstValidatedByReferrer(userId),
      this.users.findById(userId),
    ]);

    const achievements: AchievementDto[] = [];

    for (const row of questRows) {
      achievements.push({
        key: `setup_quest.${row.questKey}`,
        category: "setup_quest",
        label: SETUP_QUEST_LABELS[row.questKey] ?? row.questKey,
        unlockedAt: row.completedAt.toISOString(),
      });
    }

    for (const row of milestoneRows) {
      achievements.push({
        key: `streak_milestone.day_${row.milestoneDay}`,
        category: "streak_milestone",
        label: STREAK_MILESTONE_LABELS[row.milestoneDay] ?? `${row.milestoneDay} días de racha`,
        unlockedAt: row.claimedAt.toISOString(),
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
