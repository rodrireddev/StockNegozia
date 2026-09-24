import { Inject, Injectable } from "@nestjs/common";
import type { DailyMissionClaimResult, DailyMissionTodayDto } from "@stocknegozia/api-contracts";
import { randomUUID } from "node:crypto";
import { CreditConfigService } from "../credit-config/credit-config.service";
import { CreditsService } from "../credits/credits.service";
import { DailyMissionCompletionsRepository } from "./daily-mission-completions.repository";

interface MissionCatalogEntry {
  key: "register_3_sales" | "update_5_products_stock";
  label: string;
  /** Cuánto tiene que contar el cliente localmente para considerarla cumplida. */
  target: number;
}

/**
 * Catálogo en código, no en DB (mismo criterio que el comentario en el schema) — "cuáles existen
 * es código, lo que es config editable desde el panel admin es el crédito que otorgan y el tope
 * diario" (ya en `credit_config_items`: "source.daily_mission" y
 * "cap.daily_mission_max_per_day"). `target` es número de negocio (parte de qué es la misión), no
 * un ajuste fino de precio — por eso vive acá y no en `credit_config_items`.
 */
const MISSION_CATALOG: MissionCatalogEntry[] = [
  { key: "register_3_sales", label: "Registrá 3 ventas hoy", target: 3 },
  { key: "update_5_products_stock", label: "Actualizá el stock de 5 productos hoy", target: 5 },
];

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Rotación determinística por día (doc §1/§2, "rotan cada día") — mismo día calendario, misma
 * misión para todos los usuarios; no hace falta persistir "la misión de hoy" en ningún lado, se
 * deriva del propio día. `mobile-mini` no manda cuál es "la de hoy": el progreso (3 ventas, 5
 * stock actualizado) se cuenta 100% local (esos datos nunca llegan al backend, ver doc §6), así
 * que el cliente decide cuándo llamar a `claim()` — el servidor solo confía en eso y aplica el
 * tope de 1/día, mismo patrón de confianza que ya usan los setup quests.
 */
function missionOfTheDay(): MissionCatalogEntry {
  const daysSinceEpoch = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return MISSION_CATALOG[daysSinceEpoch % MISSION_CATALOG.length]!;
}

@Injectable()
export class DailyMissionsService {
  constructor(
    @Inject(DailyMissionCompletionsRepository) private readonly repository: DailyMissionCompletionsRepository,
    @Inject(CreditsService) private readonly creditsService: CreditsService,
    @Inject(CreditConfigService) private readonly creditConfigService: CreditConfigService,
  ) {}

  async getToday(userId: string): Promise<DailyMissionTodayDto> {
    const mission = missionOfTheDay();
    const existing = await this.repository.findByUserAndDate(userId, todayUtcDateString());
    return { missionKey: mission.key, label: mission.label, target: mission.target, alreadyClaimedToday: !!existing };
  }

  async claim(userId: string): Promise<DailyMissionClaimResult> {
    const today = todayUtcDateString();
    const mission = missionOfTheDay();

    const existing = await this.repository.findByUserAndDate(userId, today);
    if (existing) {
      return { missionKey: mission.key, alreadyClaimed: true, creditsAwarded: 0 };
    }

    const amount = await this.creditConfigService.getValueByKey("source.daily_mission");
    await this.creditsService.grant(userId, amount, "daily_mission", {
      reasonMetadata: { missionKey: mission.key },
      idempotencyKey: `daily-mission:${userId}:${today}`,
    });
    await this.repository.insert({
      id: randomUUID(),
      userId,
      missionKey: mission.key,
      activityDate: today,
      creditsAwarded: amount,
    });

    return { missionKey: mission.key, alreadyClaimed: false, creditsAwarded: amount };
  }
}
