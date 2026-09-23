import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database } from "../database/database.types";
import { adminUsers } from "../database/schema";

export interface NewAdminUserRecord {
  id: string;
  email: string;
  passwordHash: string;
}

@Injectable()
export class AdminUsersRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async findByEmail(email: string) {
    const [row] = await this.db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return row;
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return row;
  }

  async insert(data: NewAdminUserRecord) {
    const [row] = await this.db
      .insert(adminUsers)
      .values({ ...data, createdAt: new Date() })
      .returning();
    return row;
  }
}
