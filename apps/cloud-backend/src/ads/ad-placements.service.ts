import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  ActiveAdPlacementDto,
  AdPlacementDto,
  AdPlacementRevisionDto,
  AdPlatform,
} from "@stocknegozia/api-contracts";
import { AdPlacementsRepository } from "./ad-placements.repository";

type PlacementRow = Awaited<ReturnType<AdPlacementsRepository["findByKeyAndPlatform"]>>;

function toDto(row: NonNullable<PlacementRow>): AdPlacementDto {
  return {
    id: row.placement.id,
    key: row.placement.key,
    platform: row.placement.platform,
    adNetwork: row.placement.adNetwork,
    adUnitId: row.placement.adUnitId,
    enabled: row.placement.enabled,
    updatedAt: row.placement.updatedAt.toISOString(),
    updatedByAdminEmail: row.updatedByEmail,
  };
}

@Injectable()
export class AdPlacementsService {
  constructor(@Inject(AdPlacementsRepository) private readonly repository: AdPlacementsRepository) {}

  async list(): Promise<AdPlacementDto[]> {
    const rows = await this.repository.findAll();
    return rows.map(toDto);
  }

  async getByKeyAndPlatform(key: string, platform: AdPlatform): Promise<AdPlacementDto> {
    const row = await this.repository.findByKeyAndPlatform(key, platform);
    if (!row) throw new NotFoundException(`No existe un placement "${key}" para "${platform}"`);
    return toDto(row);
  }

  /**
   * `GET /ads/placements/:key` (cliente) — `null` si no existe o está deshabilitado (kill switch,
   * doc §1bis): el cliente decide su propio fallback, esto no es un error de servidor.
   */
  async getActiveForClient(key: string, platform: AdPlatform): Promise<ActiveAdPlacementDto | null> {
    const row = await this.repository.findByKeyAndPlatform(key, platform);
    if (!row || !row.placement.enabled) return null;
    return { adNetwork: row.placement.adNetwork, adUnitId: row.placement.adUnitId };
  }

  /** `PATCH /admin/ad-placements/:key/:platform` — balancea sin tocar código (doc §7/§1bis). */
  async update(
    key: string,
    platform: AdPlatform,
    changes: { adNetwork?: string; adUnitId?: string; enabled?: boolean },
    changedByAdminId: string,
    note?: string,
  ): Promise<AdPlacementDto> {
    const row = await this.repository.findByKeyAndPlatform(key, platform);
    if (!row) throw new NotFoundException(`No existe un placement "${key}" para "${platform}"`);

    await this.repository.updateWithRevision({
      placementId: row.placement.id,
      previousAdNetwork: row.placement.adNetwork,
      newAdNetwork: changes.adNetwork ?? row.placement.adNetwork,
      previousAdUnitId: row.placement.adUnitId,
      newAdUnitId: changes.adUnitId ?? row.placement.adUnitId,
      previousEnabled: row.placement.enabled,
      newEnabled: changes.enabled ?? row.placement.enabled,
      note,
      changedByAdminId,
    });

    return this.getByKeyAndPlatform(key, platform);
  }

  async listRevisions(key: string, platform: AdPlatform): Promise<AdPlacementRevisionDto[]> {
    const row = await this.repository.findByKeyAndPlatform(key, platform);
    if (!row) throw new NotFoundException(`No existe un placement "${key}" para "${platform}"`);

    const revisions = await this.repository.findRevisionsByPlacementId(row.placement.id);
    return revisions.map((r) => ({
      id: r.revision.id,
      previousAdNetwork: r.revision.previousAdNetwork,
      newAdNetwork: r.revision.newAdNetwork,
      previousAdUnitId: r.revision.previousAdUnitId,
      newAdUnitId: r.revision.newAdUnitId,
      previousEnabled: r.revision.previousEnabled,
      newEnabled: r.revision.newEnabled,
      note: r.revision.note,
      changedByAdminEmail: r.changedByEmail,
      changedAt: r.revision.changedAt.toISOString(),
    }));
  }
}
