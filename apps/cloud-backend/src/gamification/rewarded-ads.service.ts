import { Inject, Injectable } from "@nestjs/common";
import type { RewardedAdClaimResult } from "@stocknegozia/api-contracts";
import { randomUUID } from "node:crypto";
import { CreditConfigService } from "../credit-config/credit-config.service";
import { CreditsService } from "../credits/credits.service";
import { RewardedAdViewsRepository } from "./rewarded-ad-views.repository";

/** Créditos decrecientes por vista del día (doc §1: "3 / 2 / 1 decreciente"). */
const CREDIT_CONFIG_KEY_BY_SEQUENCE: Record<number, string> = {
  1: "source.rewarded_ad_view_1",
  2: "source.rewarded_ad_view_2",
  3: "source.rewarded_ad_view_3",
};

/**
 * Resultado interno de `claim()` — superset de `RewardedAdClaimResult` (el DTO público) con el id
 * de la fila de `credit_ledger` que efectivamente acreditó, para que `AdRewardCallbackService`
 * (SSV, ver `ads/ad-reward-callback.service.ts`) pueda auditar el callback contra ese ledger entry
 * en `ad_reward_callbacks.creditLedgerEntryId`. `gamification.controller.ts` nunca devuelve este
 * campo al cliente — es un detalle interno, no parte del contrato público.
 */
export interface RewardedAdClaimOutcome extends RewardedAdClaimResult {
  ledgerEntryId?: string;
}

/**
 * Todavía llamado directo por el cliente (`POST /gamification/rewarded-ad/claim`) — **interino y
 * confía en el cliente**, aceptable *solo* mientras `mobile-mini` usa el ad unit de prueba de
 * AdMob (doc §1bis): no hay revenue real en juego. `ads/ad-reward-callback.service.ts` ya llama a
 * este mismo método una vez verificada la firma real de un callback de SSV — es la lógica de
 * tope/cooldown/monto decreciente la que hace falta compartir, no quién confía en qué. El día que
 * se conecten credenciales reales de AdMob (con SSV configurado en el ad unit), el controller de
 * gamification tiene que dejar de llamar `claim()` directo y esperar solo al callback verificado
 * — de lo contrario cualquiera con un cliente modificado se autootorga créditos.
 */
@Injectable()
export class RewardedAdsService {
  constructor(
    @Inject(RewardedAdViewsRepository) private readonly repository: RewardedAdViewsRepository,
    @Inject(CreditsService) private readonly creditsService: CreditsService,
    @Inject(CreditConfigService) private readonly creditConfigService: CreditConfigService,
  ) {}

  async claim(userId: string): Promise<RewardedAdClaimOutcome> {
    const [countToday, maxPerDay, cooldownMinutes, latest] = await Promise.all([
      this.repository.countToday(userId),
      this.creditConfigService.getValueByKey("cap.rewarded_ad_max_per_day"),
      this.creditConfigService.getValueByKey("cooldown.rewarded_ad_minutes"),
      this.repository.findLatestByUser(userId),
    ]);

    if (countToday >= maxPerDay) {
      return { granted: false, creditsAwarded: 0, reason: "daily_cap" };
    }

    if (latest) {
      const minutesSinceLastView = (Date.now() - latest.viewedAt.getTime()) / 60_000;
      if (minutesSinceLastView < cooldownMinutes) {
        return { granted: false, creditsAwarded: 0, reason: "cooldown" };
      }
    }

    const sequenceInDay = countToday + 1;
    const creditConfigKey = CREDIT_CONFIG_KEY_BY_SEQUENCE[sequenceInDay] ?? CREDIT_CONFIG_KEY_BY_SEQUENCE[3]!;
    const amount = await this.creditConfigService.getValueByKey(creditConfigKey);

    // Sin idempotencyKey a propósito: mirar un anuncio es repetible, no "de una vez" (mismo
    // criterio que ya documenta el schema de `credit_ledger`).
    const ledgerEntry = await this.creditsService.grant(userId, amount, "rewarded_ad", {
      reasonMetadata: { sequenceInDay },
    });
    await this.repository.insert({ id: randomUUID(), userId, sequenceInDay, creditsAwarded: amount });

    // `.returning()` de Drizzle tipa como posiblemente vacío el array — un insert recién hecho
    // siempre devuelve la fila (mismo criterio que `accounts.service.ts`/`users.repository.ts`).
    return { granted: true, creditsAwarded: amount, sequenceInDay, ledgerEntryId: ledgerEntry!.id };
  }
}
