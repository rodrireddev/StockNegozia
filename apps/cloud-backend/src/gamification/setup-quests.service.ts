import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { SetupQuestClaimResult } from "@stocknegozia/api-contracts";
import { randomUUID } from "node:crypto";
import { AchievementDefinitionsRepository } from "../achievements/achievement-definitions.repository";
import { CreditsService } from "../credits/credits.service";
import { AchievementClaimsRepository } from "./achievement-claims.repository";

const PERIOD_KEY_ONCE = "once";

/**
 * Setup quests (doc §1): "acciones que el usuario iba a hacer igual" — el cliente llama a
 * `claim` cada vez que hace esa acción (ej. cada venta, no solo la primera); acá se decide si es
 * la primera vez. Idempotente por diseño (constraint `unique(userId, achievementDefinitionId,
 * periodKey)` de `achievement_claims`, con `periodKey = "once"`), así que el cliente no necesita
 * saber de antemano si ya lo reclamó.
 *
 * `questKey` sigue siendo un valor fijo que dispara `mobile-mini` desde un call site exacto en su
 * código (`fireSetupQuestClaim("first_product")`, etc.) — el panel admin no puede inventar un
 * setup quest nuevo (ver comentario en `achievement-definitions.ts`), solo editar
 * label/descripción/créditos/activo de los que ya existen en `achievement_definitions`.
 */
@Injectable()
export class SetupQuestsService {
  constructor(
    @Inject(AchievementDefinitionsRepository)
    private readonly achievementDefinitionsRepository: AchievementDefinitionsRepository,
    @Inject(AchievementClaimsRepository)
    private readonly achievementClaimsRepository: AchievementClaimsRepository,
    @Inject(CreditsService) private readonly creditsService: CreditsService,
  ) {}

  async claim(userId: string, questKey: string): Promise<SetupQuestClaimResult> {
    const definition = await this.achievementDefinitionsRepository.findRawByKey(
      `setup_quest.${questKey}`,
    );
    if (!definition || definition.category !== "setup_quest" || !definition.active) {
      throw new BadRequestException(`Quest de setup desconocida: "${questKey}"`);
    }

    const existing = await this.achievementClaimsRepository.findByUserDefinitionAndPeriod(
      userId,
      definition.id,
      PERIOD_KEY_ONCE,
    );
    if (existing) {
      return { questKey, alreadyClaimed: true, creditsAwarded: 0 };
    }

    await this.creditsService.grant(userId, definition.creditsAwarded, "setup_quest", {
      reasonMetadata: { questKey },
      idempotencyKey: `quest:${userId}:${questKey}`,
    });
    await this.achievementClaimsRepository.insert({
      id: randomUUID(),
      userId,
      achievementDefinitionId: definition.id,
      periodKey: PERIOD_KEY_ONCE,
      creditsAwarded: definition.creditsAwarded,
    });

    return { questKey, alreadyClaimed: false, creditsAwarded: definition.creditsAwarded };
  }
}
