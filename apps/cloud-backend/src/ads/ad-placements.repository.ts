import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database } from "../database/database.types";
import {
  adminUsers,
  adPlacementRevisions,
  adPlacements,
  type adPlatformEnum,
} from "../database/schema";

type Platform = (typeof adPlatformEnum.enumValues)[number];

@Injectable()
export class AdPlacementsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findAll() {
    return this.db
      .select({ placement: adPlacements, updatedByEmail: adminUsers.email })
      .from(adPlacements)
      .leftJoin(adminUsers, eq(adPlacements.updatedByAdminId, adminUsers.id))
      .orderBy(asc(adPlacements.key), asc(adPlacements.platform));
  }

  async findByKeyAndPlatform(key: string, platform: Platform) {
    const [row] = await this.db
      .select({ placement: adPlacements, updatedByEmail: adminUsers.email })
      .from(adPlacements)
      .leftJoin(adminUsers, eq(adPlacements.updatedByAdminId, adminUsers.id))
      .where(and(eq(adPlacements.key, key), eq(adPlacements.platform, platform)));
    return row;
  }

  async findRevisionsByPlacementId(placementId: string) {
    const changedBy = alias(adminUsers, "changed_by");
    return this.db
      .select({ revision: adPlacementRevisions, changedByEmail: changedBy.email })
      .from(adPlacementRevisions)
      .innerJoin(changedBy, eq(adPlacementRevisions.changedByAdminId, changedBy.id))
      .where(eq(adPlacementRevisions.placementId, placementId))
      .orderBy(desc(adPlacementRevisions.changedAt));
  }

  /** Misma transacción que `CreditConfigRepository.updateValueWithRevision` — nunca desincronizados. */
  async updateWithRevision(params: {
    placementId: string;
    previousAdNetwork: string;
    newAdNetwork: string;
    previousAdUnitId: string;
    newAdUnitId: string;
    previousEnabled: boolean;
    newEnabled: boolean;
    note?: string;
    changedByAdminId: string;
  }) {
    return this.db.transaction(async (tx) => {
      const now = new Date();
      await tx
        .update(adPlacements)
        .set({
          adNetwork: params.newAdNetwork,
          adUnitId: params.newAdUnitId,
          enabled: params.newEnabled,
          updatedAt: now,
          updatedByAdminId: params.changedByAdminId,
        })
        .where(eq(adPlacements.id, params.placementId));

      await tx.insert(adPlacementRevisions).values({
        id: randomUUID(),
        placementId: params.placementId,
        previousAdNetwork: params.previousAdNetwork,
        newAdNetwork: params.newAdNetwork,
        previousAdUnitId: params.previousAdUnitId,
        newAdUnitId: params.newAdUnitId,
        previousEnabled: params.previousEnabled,
        newEnabled: params.newEnabled,
        note: params.note ?? null,
        changedByAdminId: params.changedByAdminId,
        changedAt: now,
      });
    });
  }
}
