import { Inject, Injectable } from "@nestjs/common";
import { desc, eq, sql } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { adminUsers, houseAdImpressions, houseAds } from "../database/schema";

@Injectable()
export class HouseAdsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  /** Panel admin — todos, con la cuenta de impresiones para decidir si vale la pena (doc §7). */
  async findAllWithImpressionCount() {
    return this.db
      .select({
        houseAd: houseAds,
        updatedByEmail: adminUsers.email,
        impressionCount: sql<number>`count(${houseAdImpressions.id})`,
      })
      .from(houseAds)
      .leftJoin(adminUsers, eq(houseAds.updatedByAdminId, adminUsers.id))
      .leftJoin(houseAdImpressions, eq(houseAdImpressions.houseAdId, houseAds.id))
      .groupBy(houseAds.id, adminUsers.email)
      .orderBy(desc(houseAds.priority));
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(houseAds).where(eq(houseAds.id, id));
    return row;
  }

  /** Misma forma que `findAllWithImpressionCount()` pero para una sola fila — la usan
   *  `create()`/`update()` del service para devolver el DTO completo tras escribir. */
  async findByIdWithDetails(id: string) {
    const [row] = await this.db
      .select({
        houseAd: houseAds,
        updatedByEmail: adminUsers.email,
        impressionCount: sql<number>`count(${houseAdImpressions.id})`,
      })
      .from(houseAds)
      .leftJoin(adminUsers, eq(houseAds.updatedByAdminId, adminUsers.id))
      .leftJoin(houseAdImpressions, eq(houseAdImpressions.houseAdId, houseAds.id))
      .where(eq(houseAds.id, id))
      .groupBy(houseAds.id, adminUsers.email);
    return row;
  }

  /** El de mayor prioridad activo — cliente, cuando AdMob no tiene fill (doc §1bis). */
  async findTopActive() {
    const [row] = await this.db
      .select()
      .from(houseAds)
      .where(eq(houseAds.enabled, true))
      .orderBy(desc(houseAds.priority))
      .limit(1);
    return row;
  }

  async insert(data: {
    id: string;
    title: string;
    body?: string;
    imageUrl?: string;
    ctaLabel: string;
    ctaUrl: string;
    enabled: boolean;
    priority: number;
    updatedByAdminId: string;
  }) {
    const now = new Date();
    const [row] = await this.db
      .insert(houseAds)
      .values({ ...data, createdAt: now, updatedAt: now })
      .returning();
    return row!;
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      body: string | null;
      imageUrl: string | null;
      ctaLabel: string;
      ctaUrl: string;
      enabled: boolean;
      priority: number;
    }>,
    updatedByAdminId: string,
  ) {
    await this.db
      .update(houseAds)
      .set({ ...data, updatedAt: new Date(), updatedByAdminId })
      .where(eq(houseAds.id, id));
  }

  async insertImpression(data: { id: string; houseAdId: string; userId?: string }) {
    await this.db.insert(houseAdImpressions).values({ ...data, shownAt: new Date() });
  }
}
