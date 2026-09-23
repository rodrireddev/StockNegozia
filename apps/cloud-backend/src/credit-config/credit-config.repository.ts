import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { adminUsers, creditConfigItemRevisions, creditConfigItems } from "../database/schema";

@Injectable()
export class CreditConfigRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findAll() {
    return this.db
      .select({ item: creditConfigItems, updatedByEmail: adminUsers.email })
      .from(creditConfigItems)
      .leftJoin(adminUsers, eq(creditConfigItems.updatedByAdminId, adminUsers.id))
      .orderBy(creditConfigItems.category, creditConfigItems.key);
  }

  async findByKey(key: string) {
    const [row] = await this.db
      .select({ item: creditConfigItems, updatedByEmail: adminUsers.email })
      .from(creditConfigItems)
      .leftJoin(adminUsers, eq(creditConfigItems.updatedByAdminId, adminUsers.id))
      .where(eq(creditConfigItems.key, key));
    return row;
  }

  async findRevisionsByItemId(itemId: string) {
    const changedBy = alias(adminUsers, "changed_by");
    return this.db
      .select({ revision: creditConfigItemRevisions, changedByEmail: changedBy.email })
      .from(creditConfigItemRevisions)
      .innerJoin(changedBy, eq(creditConfigItemRevisions.changedByAdminId, changedBy.id))
      .where(eq(creditConfigItemRevisions.itemId, itemId))
      .orderBy(desc(creditConfigItemRevisions.changedAt));
  }

  /**
   * Actualiza el valor vigente y agrega la revisión en la misma transacción — nunca deberían
   * quedar desincronizados (doc §7: el historial tiene que reflejar exactamente los cambios que
   * pasaron por el valor vigente).
   */
  async updateValueWithRevision(params: {
    itemId: string;
    previousValue: number;
    newValue: number;
    note?: string;
    changedByAdminId: string;
  }) {
    return this.db.transaction(async (tx) => {
      const now = new Date();
      await tx
        .update(creditConfigItems)
        .set({ value: params.newValue, updatedAt: now, updatedByAdminId: params.changedByAdminId })
        .where(eq(creditConfigItems.id, params.itemId));

      await tx.insert(creditConfigItemRevisions).values({
        id: randomUUID(),
        itemId: params.itemId,
        previousValue: params.previousValue,
        newValue: params.newValue,
        note: params.note ?? null,
        changedByAdminId: params.changedByAdminId,
        changedAt: now,
      });
    });
  }
}
