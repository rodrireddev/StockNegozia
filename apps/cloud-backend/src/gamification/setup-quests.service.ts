import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { SetupQuestClaimResult } from "@stocknegozia/api-contracts";
import { randomUUID } from "node:crypto";
import { CreditConfigService } from "../credit-config/credit-config.service";
import { CreditsService } from "../credits/credits.service";
import { SetupQuestCompletionsRepository } from "./setup-quest-completions.repository";

export const SETUP_QUEST_KEYS = ["first_product", "first_sale", "first_scan", "profile_complete"] as const;
export type SetupQuestKey = (typeof SETUP_QUEST_KEYS)[number];

/**
 * Setup quests (doc §1): "acciones que el usuario iba a hacer igual" — el cliente llama a
 * `claim` cada vez que hace esa acción (ej. cada venta, no solo la primera); acá se decide si es
 * la primera vez. Idempotente por diseño (constraint `unique(userId, questKey)`), así que el
 * cliente no necesita saber de antemano si ya lo reclamó — más simple que trackear "primera vez"
 * en el dispositivo, y funciona igual aunque se reinstale la app.
 */
@Injectable()
export class SetupQuestsService {
  constructor(
    @Inject(SetupQuestCompletionsRepository) private readonly repository: SetupQuestCompletionsRepository,
    @Inject(CreditsService) private readonly creditsService: CreditsService,
    @Inject(CreditConfigService) private readonly creditConfigService: CreditConfigService,
  ) {}

  async claim(userId: string, questKey: string): Promise<SetupQuestClaimResult> {
    if (!SETUP_QUEST_KEYS.includes(questKey as SetupQuestKey)) {
      throw new BadRequestException(`Quest de setup desconocida: "${questKey}"`);
    }

    const existing = await this.repository.findByUserAndKey(userId, questKey as SetupQuestKey);
    if (existing) {
      return { questKey, alreadyClaimed: true, creditsAwarded: 0 };
    }

    const amount = await this.creditConfigService.getValueByKey("source.setup_quest");
    await this.creditsService.grant(userId, amount, "setup_quest", {
      reasonMetadata: { questKey },
      idempotencyKey: `quest:${userId}:${questKey}`,
    });
    await this.repository.insert({
      id: randomUUID(),
      userId,
      questKey: questKey as SetupQuestKey,
      creditsAwarded: amount,
    });

    return { questKey, alreadyClaimed: false, creditsAwarded: amount };
  }
}
