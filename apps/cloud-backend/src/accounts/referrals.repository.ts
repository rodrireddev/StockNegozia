import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, gte, sql } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { referrals } from "../database/schema";

@Injectable()
export class ReferralsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async insertPending(data: { id: string; referrerUserId: string; referredUserId: string }) {
    const [row] = await this.db
      .insert(referrals)
      .values({ ...data, status: "pending", createdAt: new Date() })
      .returning();
    return row;
  }

  async findPendingByReferredUserId(referredUserId: string) {
    const [row] = await this.db
      .select()
      .from(referrals)
      .where(and(eq(referrals.referredUserId, referredUserId), eq(referrals.status, "pending")));
    return row;
  }

  /** Para el tope mensual del doc §1 ("15, tope 10/mes con retorno completo"). */
  async countValidatedThisMonthByReferrer(referrerUserId: string): Promise<number> {
    const startOfMonth = new Date(
      Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
    );
    const rows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(referrals)
      .where(
        and(
          eq(referrals.referrerUserId, referrerUserId),
          eq(referrals.status, "validated"),
          gte(referrals.validatedAt, startOfMonth),
        ),
      );
    return Number(rows[0]?.count ?? 0);
  }

  /** Para el logro "trajiste a alguien" — la primera vez que este usuario validó a un invitado. */
  async findFirstValidatedByReferrer(referrerUserId: string) {
    const [row] = await this.db
      .select()
      .from(referrals)
      .where(and(eq(referrals.referrerUserId, referrerUserId), eq(referrals.status, "validated")))
      .orderBy(asc(referrals.validatedAt))
      .limit(1);
    return row;
  }

  /** El invitado no llegó a día 3 de racha dentro de la primera semana (doc §1, "éxito" = real). */
  async markExpired(id: string) {
    await this.db.update(referrals).set({ status: "expired" }).where(eq(referrals.id, id));
  }

  async markValidated(
    id: string,
    data: { creditsAwardedReferrer: number; creditsAwardedReferred: number },
  ) {
    await this.db
      .update(referrals)
      .set({
        status: "validated",
        validatedAt: new Date(),
        creditsAwardedReferrer: data.creditsAwardedReferrer,
        creditsAwardedReferred: data.creditsAwardedReferred,
      })
      .where(eq(referrals.id, id));
  }
}
