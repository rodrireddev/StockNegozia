import { Inject, Injectable } from "@nestjs/common";
import { and, eq, lt } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database } from "../../database/database.types";
import { pairingSessions } from "../../database/schema";
import type { PairingStatus } from "./pairing.types";

export interface NewPairingSessionRecord {
  id: string;
  tokenHash: string;
  verificationCodeHash: string;
  expiresAt: Date;
}

@Injectable()
export class PairingRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  insert(data: NewPairingSessionRecord) {
    return this.db
      .insert(pairingSessions)
      .values({ ...data, status: "pending", createdAt: new Date() })
      .returning()
      .get();
  }

  findById(id: string) {
    return this.db.select().from(pairingSessions).where(eq(pairingSessions.id, id)).get();
  }

  confirm(id: string, deviceId: string, confirmedAt: Date) {
    this.db
      .update(pairingSessions)
      .set({ status: "confirmed", deviceId, confirmedAt })
      .where(eq(pairingSessions.id, id))
      .run();
  }

  updateStatus(id: string, status: PairingStatus) {
    this.db.update(pairingSessions).set({ status }).where(eq(pairingSessions.id, id)).run();
  }

  /**
   * Cleanup oportunista (sin scheduler, ver docs/security/PAIRING.md §Cleanup): marca como
   * `expired` toda sesión `pending` cuyo `expiresAt` ya pasó. Se llama al crear un pairing nuevo y
   * al intentar confirmar uno — así una sesión vencida nunca queda "pending" indefinidamente.
   */
  expireStale(now: Date): void {
    this.db
      .update(pairingSessions)
      .set({ status: "expired" })
      .where(and(eq(pairingSessions.status, "pending"), lt(pairingSessions.expiresAt, now)))
      .run();
  }
}
