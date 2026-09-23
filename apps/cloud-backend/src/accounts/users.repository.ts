import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database, DrizzleExecutor } from "../database/database.types";
import { users } from "../database/schema";

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
}
