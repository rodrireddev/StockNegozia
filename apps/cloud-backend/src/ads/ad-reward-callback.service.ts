import { BadRequestException, Inject, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { RewardedAdsService } from "../gamification/rewarded-ads.service";
import { AdRewardCallbacksRepository } from "./ad-reward-callbacks.repository";
import { SsvKeysService } from "./ssv-keys.service";
import { splitSignedQuery, verifySsvSignature } from "./ssv-verifier";

/**
 * Server-Side Verification (SSV) real de AdMob — reemplaza la confianza ciega del cliente
 * (`RewardedAdsService.claim` llamado directo desde `POST /gamification/rewarded-ad/claim`) por
 * un callback firmado por Google que solo se puede generar si el usuario efectivamente terminó de
 * ver un rewarded ad real. Reusa `RewardedAdsService.claim()` para el tope/cooldown/monto —
 * la única diferencia es QUIÉN puede dispararlo (ver el comentario en ese servicio).
 *
 * Sin efecto mientras `mobile-mini` siga usando el ad unit de prueba de AdMob (`TestIds.REWARDED`,
 * ver `useRewardedAd.ts`): ese ad unit no tiene SSV configurado en ningún lado, así que Google
 * nunca va a llamar a este endpoint hasta que haya una cuenta de AdMob real con un ad unit propio
 * que apunte su "Callback URL" (configurada en el dashboard de AdMob) acá.
 */
@Injectable()
export class AdRewardCallbackService {
  private readonly logger = new Logger(AdRewardCallbackService.name);

  constructor(
    @Inject(AdRewardCallbacksRepository) private readonly repository: AdRewardCallbacksRepository,
    @Inject(SsvKeysService) private readonly keysService: SsvKeysService,
    @Inject(RewardedAdsService) private readonly rewardedAdsService: RewardedAdsService,
  ) {}

  /** `rawQuery` es la query string tal cual llegó en la request (sin decodificar/reserializar). */
  async handle(rawQuery: string): Promise<void> {
    const split = splitSignedQuery(rawQuery);
    if (!split) throw new BadRequestException("Callback de SSV mal formado");
    const { content, signature, keyId } = split;

    const keys = await this.keysService.getKeys();
    const key = keys.find((k) => String(k.keyId) === keyId);
    if (!key) throw new UnauthorizedException("Clave de verificación de AdMob desconocida");

    if (!verifySsvSignature(content, signature, key.pem)) {
      this.logger.warn("Firma de SSV inválida — callback descartado");
      throw new UnauthorizedException("Firma de SSV inválida");
    }

    const params = new URLSearchParams(content);
    const transactionId = params.get("transaction_id");
    const userId = params.get("user_id");
    const adUnit = params.get("ad_unit");
    const rewardItem = params.get("reward_item");
    const rewardAmountRaw = params.get("reward_amount");
    const adNetwork = params.get("ad_network") ?? "admob";

    if (!transactionId || !userId || !adUnit || !rewardItem || !rewardAmountRaw) {
      throw new BadRequestException("Callback de SSV incompleto — faltan parámetros esperados");
    }

    // `transaction_id` es la clave de idempotencia (doc de Google: reintenta hasta 5 veces si la
    // respuesta se pierde en la red) — sin este check, un reintento acreditaría dos veces.
    const existing = await this.repository.findByTransactionId(transactionId);
    if (existing) return;

    const claim = await this.rewardedAdsService.claim(userId);

    await this.repository.insert({
      id: randomUUID(),
      transactionId,
      userId,
      adNetwork,
      adUnit,
      rewardItem,
      rewardAmount: Number(rewardAmountRaw),
      verifiedAt: new Date(),
      creditLedgerEntryId: claim.ledgerEntryId ?? null,
    });
  }
}
