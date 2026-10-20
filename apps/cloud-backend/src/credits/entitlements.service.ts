import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type {
  EntitlementCatalogItemDto,
  EntitlementDto,
  PurchaseEntitlementResult,
} from "@stocknegozia/api-contracts";
import { randomUUID } from "node:crypto";
import { CreditConfigService } from "../credit-config/credit-config.service";
import { CreditsService, type CreditReason } from "./credits.service";
import { EntitlementsRepository } from "./entitlements.repository";

type EntitlementType = "cloud_backup" | "remove_ads";

const ENTITLEMENT_CONFIG: Record<
  EntitlementType,
  { creditConfigKey: string; creditReason: CreditReason; label: string; description: string }
> = {
  cloud_backup: {
    creditConfigKey: "sink.cloud_backup_30d",
    creditReason: "cloud_backup_subscription",
    label: "Backup en la nube",
    description: "Copia de seguridad automática de tus productos y ventas por 30 días.",
  },
  remove_ads: {
    creditConfigKey: "sink.remove_ads_30d",
    creditReason: "remove_ads_subscription",
    label: "Sacarse los anuncios",
    description:
      "Sin publicidad por 30 días — cubre el rewarded ad de esta app y el banner de StockNegozia de escritorio, con la misma cuenta.",
  },
};

const SUBSCRIPTION_DAYS = 30;

/**
 * Los dos sinks "de suscripción" del doc §1 — comprar extiende `expiresAt` en vez de reemplazarlo
 * (doc: "se renuevan extendiendo `expiresAt`"), así que comprar antes de que venza no desperdicia
 * el tiempo que quedaba. `entitlements` no está atado a plataforma (doc §1bis): comprar una vez
 * cubre el banner de `apps/desktop` y lo que corresponda en `mobile-mini` con la misma cuenta.
 */
@Injectable()
export class EntitlementsService {
  constructor(
    @Inject(EntitlementsRepository) private readonly repository: EntitlementsRepository,
    @Inject(CreditsService) private readonly creditsService: CreditsService,
    @Inject(CreditConfigService) private readonly creditConfigService: CreditConfigService,
  ) {}

  async listForUser(userId: string): Promise<EntitlementDto[]> {
    const rows = await this.repository.findAllByUser(userId);
    return rows.map((row) => ({
      type: row.type,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    }));
  }

  /**
   * `GET /credits/me/entitlements/catalog` — lo que necesita la pantalla de compra: costo actual
   * (siempre leído de `credit_config_items`, nunca hardcodeado) fusionado con el estado real de
   * cada entitlement para este usuario.
   */
  async listCatalogForUser(userId: string): Promise<EntitlementCatalogItemDto[]> {
    const [rows, ...costs] = await Promise.all([
      this.repository.findAllByUser(userId),
      ...(Object.keys(ENTITLEMENT_CONFIG) as EntitlementType[]).map((type) =>
        this.creditConfigService.getValueByKey(ENTITLEMENT_CONFIG[type].creditConfigKey),
      ),
    ]);

    const existingByType = new Map(rows.map((row) => [row.type, row]));
    const types = Object.keys(ENTITLEMENT_CONFIG) as EntitlementType[];

    return types.map((type, index) => {
      const config = ENTITLEMENT_CONFIG[type];
      const existing = existingByType.get(type);
      return {
        type,
        label: config.label,
        description: config.description,
        cost: costs[index]!,
        expiresAt: existing?.expiresAt ? existing.expiresAt.toISOString() : null,
      };
    });
  }

  /**
   * Chequea saldo y descuenta antes de extender el entitlement — mismo límite conocido que
   * `CreditsService.grant` (sin lock real por usuario, ver ese comentario): dos compras
   * concurrentes del mismo usuario podrían leer un saldo desactualizado. Aceptable para v1.
   */
  async purchase(userId: string, rawType: string): Promise<PurchaseEntitlementResult> {
    const config = ENTITLEMENT_CONFIG[rawType as EntitlementType];
    if (!config) throw new BadRequestException(`Tipo de entitlement desconocido: "${rawType}"`);
    const type = rawType as EntitlementType;

    const cost = await this.creditConfigService.getValueByKey(config.creditConfigKey);

    const balance = await this.creditsService.getBalance(userId);
    if (balance < cost) {
      throw new BadRequestException(
        `Saldo insuficiente: hacen falta ${cost} créditos, tenés ${balance}`,
      );
    }

    await this.creditsService.grant(userId, -cost, config.creditReason, {
      reasonMetadata: { entitlementType: type, days: SUBSCRIPTION_DAYS },
    });

    const existing = await this.repository.findByUserAndType(userId, type);
    const now = new Date();
    const base = existing?.expiresAt && existing.expiresAt > now ? existing.expiresAt : now;
    const expiresAt = new Date(base.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);

    await this.repository.upsertExpiry({ id: randomUUID(), userId, type, expiresAt });

    return { type, expiresAt: expiresAt.toISOString(), creditsSpent: cost };
  }
}
