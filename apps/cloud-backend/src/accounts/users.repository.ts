import { Inject, Injectable } from "@nestjs/common";
import { eq, or } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database, DrizzleExecutor } from "../database/database.types";
import {
  accountTokens,
  achievementClaims,
  activityEvents,
  adRewardCallbacks,
  creditLedger,
  entitlements,
  featureRequests,
  featureVotes,
  houseAdImpressions,
  referrals,
  rewardedAdViews,
  users,
} from "../database/schema";

export interface NewUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  referralCode: string;
  referredByUserId?: string;
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findByEmail(email: string) {
    const [row] = await this.db.select().from(users).where(eq(users.email, email));
    return row;
  }

  async findById(id: string, executor: DrizzleExecutor = this.db) {
    const [row] = await executor.select().from(users).where(eq(users.id, id));
    return row;
  }

  async findByReferralCode(referralCode: string) {
    const [row] = await this.db.select().from(users).where(eq(users.referralCode, referralCode));
    return row;
  }

  async insert(data: NewUserRecord) {
    const now = new Date();
    const [row] = await this.db
      .insert(users)
      .values({ ...data, createdAt: now, updatedAt: now })
      .returning();
    // Un INSERT sin conflicto siempre devuelve la fila insertada — TS no puede probarlo por el
    // tipo de `.returning()` (array, no tupla no vacía).
    return row!;
  }

  async updateStreak(
    id: string,
    data: { currentStreak: number; longestStreak: number; lastActiveDate: string },
    executor: DrizzleExecutor = this.db,
  ) {
    await executor
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async markEmailVerified(id: string) {
    await this.db
      .update(users)
      .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updatePasswordHash(id: string, passwordHash: string) {
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  /**
   * Borrado de cuenta (política de Google Play: cualquier app con cuentas tiene que ofrecer
   * borrar la cuenta y sus datos, tanto dentro de la app como por un link web — ver
   * `AccountsController.deleteMe` y el doc de políticas). Elimina todo lo que le pertenece a este
   * usuario en cascada manual (sin `onDelete` en el schema): `feature_votes`/`feature_requests`
   * antes que nada porque nada más los referencia; `referrals` en cualquiera de los dos roles
   * (referidor o referido) — no revierte los créditos ya otorgados, esos ya son historia inmutable
   * en `credit_ledger`; `users.referredByUserId` de OTRO usuario que haya sido invitado por este
   * se pone en `null` en vez de fallar por la FK. Todo en una sola transacción — o se borra todo,
   * o no se borra nada.
   */
  async deleteAccountAndAllData(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(featureVotes).where(eq(featureVotes.userId, id));
      await tx.delete(featureRequests).where(eq(featureRequests.createdByUserId, id));
      await tx
        .delete(referrals)
        .where(or(eq(referrals.referrerUserId, id), eq(referrals.referredUserId, id)));
      await tx.update(users).set({ referredByUserId: null }).where(eq(users.referredByUserId, id));
      await tx.delete(houseAdImpressions).where(eq(houseAdImpressions.userId, id));
      await tx.delete(adRewardCallbacks).where(eq(adRewardCallbacks.userId, id));
      await tx.delete(rewardedAdViews).where(eq(rewardedAdViews.userId, id));
      await tx.delete(achievementClaims).where(eq(achievementClaims.userId, id));
      await tx.delete(activityEvents).where(eq(activityEvents.userId, id));
      await tx.delete(entitlements).where(eq(entitlements.userId, id));
      await tx.delete(accountTokens).where(eq(accountTokens.userId, id));
      await tx.delete(creditLedger).where(eq(creditLedger.userId, id));
      await tx.delete(users).where(eq(users.id, id));
    });
  }
}
