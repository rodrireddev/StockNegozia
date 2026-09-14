import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database } from "../../database/database.types";
import { categories } from "../../database/schema";

@Injectable()
export class CategoriesRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  findAll() {
    return this.db.select().from(categories).orderBy(categories.name).all();
  }

  findById(id: number) {
    return this.db.select().from(categories).where(eq(categories.id, id)).get();
  }

  findByName(name: string) {
    return this.db.select().from(categories).where(eq(categories.name, name)).get();
  }

  insert(name: string) {
    return this.db.insert(categories).values({ name, createdAt: new Date() }).returning().get();
  }
}
