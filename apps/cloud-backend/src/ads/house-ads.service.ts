import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { ActiveHouseAdDto, HouseAdDto } from "@stocknegozia/api-contracts";
import type { CreateHouseAdInput, UpdateHouseAdInput } from "@stocknegozia/validation";
import { randomUUID } from "node:crypto";
import { HouseAdsRepository } from "./house-ads.repository";

type HouseAdRow = Awaited<ReturnType<HouseAdsRepository["findByIdWithDetails"]>>;

function toDto(row: NonNullable<HouseAdRow>): HouseAdDto {
  return {
    id: row.houseAd.id,
    title: row.houseAd.title,
    body: row.houseAd.body,
    imageUrl: row.houseAd.imageUrl,
    ctaLabel: row.houseAd.ctaLabel,
    ctaUrl: row.houseAd.ctaUrl,
    enabled: row.houseAd.enabled,
    priority: row.houseAd.priority,
    impressionCount: Number(row.impressionCount),
    updatedAt: row.houseAd.updatedAt.toISOString(),
    updatedByAdminEmail: row.updatedByEmail,
  };
}

@Injectable()
export class HouseAdsService {
  constructor(@Inject(HouseAdsRepository) private readonly repository: HouseAdsRepository) {}

  async list(): Promise<HouseAdDto[]> {
    const rows = await this.repository.findAllWithImpressionCount();
    return rows.map(toDto);
  }

  async create(input: CreateHouseAdInput, adminId: string): Promise<HouseAdDto> {
    const inserted = await this.repository.insert({
      id: randomUUID(),
      ...input,
      updatedByAdminId: adminId,
    });
    const row = await this.repository.findByIdWithDetails(inserted.id);
    return toDto(row!);
  }

  async update(id: string, input: UpdateHouseAdInput, adminId: string): Promise<HouseAdDto> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException(`No existe el house ad "${id}"`);
    await this.repository.update(id, input, adminId);
    const row = await this.repository.findByIdWithDetails(id);
    return toDto(row!);
  }

  /** `GET /ads/house-ad/active` (cliente) — fallback cuando AdMob no tiene fill (doc §1bis). */
  async getActiveForClient(): Promise<ActiveHouseAdDto | null> {
    const row = await this.repository.findTopActive();
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      imageUrl: row.imageUrl,
      ctaLabel: row.ctaLabel,
      ctaUrl: row.ctaUrl,
    };
  }

  async recordImpression(houseAdId: string, userId?: string): Promise<void> {
    const existing = await this.repository.findById(houseAdId);
    if (!existing) throw new NotFoundException(`No existe el house ad "${houseAdId}"`);
    await this.repository.insertImpression({ id: randomUUID(), houseAdId, userId });
  }
}
