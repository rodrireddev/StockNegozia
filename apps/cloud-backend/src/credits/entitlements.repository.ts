import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { entitlements, type entitlementTypeEnum } from "../database/schema";

type EntitlementType = (typeof entitlementTypeEnum.enumValues)[number];

@Injectable()
export class EntitlementsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findAllByUser(userId: string) {
    return this.db.select().from(entitlements).where(eq(entitlements.userId, userId));
  }

  async findByUserAndType(userId: string, type: EntitlementType) {
    const [row] = await this.db
      .select()
      .from(entitlements)
      .where(and(eq(entitlements.userId, userId), eq(entitlements.type, type)));
    return row;
  }

  /** Crea la fila si no existe, o extiende `expiresAt` si ya existe (doc: nunca una fila nueva). */
  async upsertExpiry(data: { id: string; userId: string; type: EntitlementType; expiresAt: Date }) {
    await this.db
      .insert(entitlements)
      .values({ ...data, createdAt: new Date() })
      .onConflictDoUpdate({
        target: [entitlements.userId, entitlements.type],
        set: { expiresAt: data.expiresAt },
      });
  }
}
