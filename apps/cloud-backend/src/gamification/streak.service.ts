import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { RecordActivityResult } from "@stocknegozia/api-contracts";
import { randomUUID } from "node:crypto";
import { AchievementDefinitionsRepository } from "../achievements/achievement-definitions.repository";
import { ReferralsRepository } from "../accounts/referrals.repository";
import { UsersRepository } from "../accounts/users.repository";
import { CreditConfigService } from "../credit-config/credit-config.service";
import { CreditsService } from "../credits/credits.service";
import { AchievementClaimsRepository } from "./achievement-claims.repository";

/** "Éxito" de un referido (doc §1) = llega a este día de racha... */
const REFERRAL_VALIDATION_STREAK_DAY = 3;
/** ...dentro de su primera semana como cuenta (doc §1: "en su 1ª semana"). */
const REFERRAL_VALIDATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class StreakService {
  constructor(
    @Inject(UsersRepository) private readonly usersRepository: UsersRepository,
    @Inject(ReferralsRepository) private readonly referralsRepository: ReferralsRepository,
    @Inject(AchievementDefinitionsRepository)
    private readonly achievementDefinitionsRepository: AchievementDefinitionsRepository,
    @Inject(AchievementClaimsRepository) private readonly achievementClaimsRepository: AchievementClaimsRepository,
    @Inject(CreditsService) private readonly creditsService: CreditsService,
    @Inject(CreditConfigService) private readonly creditConfigService: CreditConfigService,
  ) {}

  /**
   * Se llama cuando el cliente hace algo real (venta, ajuste de stock, etc. — cualquier evento de
   * la whitelist de métricas, ver `GamificationController.recordActivity`) — nunca por solo abrir
   * la app. Idempotente por día: llamarlo varias veces el mismo día no rompe la racha ni duplica
   * créditos.
   */
  async recordActivity(userId: string): Promise<RecordActivityResult> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException("Cuenta no encontrada");

    const now = new Date();
    const today = toUtcDateString(now);

    if (user.lastActiveDate === today) {
      // Ya se contó hoy — no hay nada nuevo que hacer con la racha (el evento de actividad en sí
      // ya se insertó aparte, en `ActivityEventsRepository`, esto solo evita mover la racha dos
      // veces el mismo día).
      return {
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        milestoneReached: null,
        creditsAwarded: 0,
        goalsCompleted: [],
      };
    }

    const yesterday = toUtcDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const newStreak = user.lastActiveDate === yesterday ? user.currentStreak + 1 : 1;
    const newLongest = Math.max(user.longestStreak, newStreak);

    await this.usersRepository.updateStreak(userId, {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: today,
    });

    let creditsAwarded = 0;
    let milestoneReached: number | null = null;

    // Hitos de racha configurados desde el panel admin (`achievement_definitions`, categoría
    // `streak_milestone`) — cualquier cantidad de días, no una lista fija de 4 hardcodeada.
    const milestones = await this.achievementDefinitionsRepository.findActiveByCategory("streak_milestone");
    const reachedMilestone = milestones.find((m) => m.target === newStreak);
    if (reachedMilestone) {
      const claimed = await this.achievementClaimsRepository.findByUserDefinitionAndPeriod(
        userId,
        reachedMilestone.id,
        "streak",
      );
      if (!claimed) {
        await this.creditsService.grant(userId, reachedMilestone.creditsAwarded, "streak_milestone", {
          reasonMetadata: { milestoneDay: newStreak, achievementKey: reachedMilestone.key },
          idempotencyKey: `streak:${userId}:${newStreak}`,
        });
        await this.achievementClaimsRepository.insert({
          id: randomUUID(),
          userId,
          achievementDefinitionId: reachedMilestone.id,
          periodKey: "streak",
          creditsAwarded: reachedMilestone.creditsAwarded,
        });
        creditsAwarded = reachedMilestone.creditsAwarded;
        milestoneReached = newStreak;
      }
    }

    if (newStreak >= REFERRAL_VALIDATION_STREAK_DAY) {
      await this.tryValidateReferral(userId, user.createdAt, now);
    }

    return { currentStreak: newStreak, longestStreak: newLongest, milestoneReached, creditsAwarded, goalsCompleted: [] };
  }

  /**
   * "Éxito" = actividad real del invitado en su primera semana, no la sola instalación (doc §1).
   * Acá "actividad real" se opera como "llegó a día 3 de racha" — ya requiere que el cliente haya
   * llamado a este mismo endpoint 3 días distintos, así que no es solo abrir la app una vez.
   */
  private async tryValidateReferral(referredUserId: string, referredUserCreatedAt: Date, now: Date): Promise<void> {
    const pending = await this.referralsRepository.findPendingByReferredUserId(referredUserId);
    if (!pending) return;

    const withinWindow = now.getTime() - referredUserCreatedAt.getTime() <= REFERRAL_VALIDATION_WINDOW_MS;
    if (!withinWindow) {
      await this.referralsRepository.markExpired(pending.id);
      return;
    }

    const referredBonus = await this.creditConfigService.getValueByKey("source.referral_bonus");
    const monthlyCap = await this.creditConfigService.getValueByKey("cap.referral_max_per_month");
    const validatedThisMonth = await this.referralsRepository.countValidatedThisMonthByReferrer(
      pending.referrerUserId,
    );
    // "Tope 10/mes con retorno completo" (doc §1): el invitado siempre cobra su bonus; el
    // invitador deja de cobrar el suyo una vez llega al tope mensual, no se prorratea.
    const referrerBonus = validatedThisMonth < monthlyCap ? referredBonus : 0;

    await this.creditsService.grant(referredUserId, referredBonus, "referral_bonus", {
      reasonMetadata: { referralId: pending.id, role: "referred" },
      idempotencyKey: `referral:referred:${pending.id}`,
    });
    if (referrerBonus > 0) {
      await this.creditsService.grant(pending.referrerUserId, referrerBonus, "referral_bonus", {
        reasonMetadata: { referralId: pending.id, role: "referrer" },
        idempotencyKey: `referral:referrer:${pending.id}`,
      });
    }
    await this.referralsRepository.markValidated(pending.id, {
      creditsAwardedReferrer: referrerBonus,
      creditsAwardedReferred: referredBonus,
    });
  }
}
