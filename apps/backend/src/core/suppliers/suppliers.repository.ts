import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database, DrizzleExecutor } from "../../database/database.types";
import { suppliers } from "../../database/schema";

export interface NewSupplierRecord {
  name: string;
}

@Injectable()
export class SuppliersRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  findAll(executor: DrizzleExecutor = this.db) {
    return executor.select().from(suppliers).orderBy(asc(suppliers.name)).all();
  }

  findById(id: number, executor: DrizzleExecutor = this.db) {
    return executor.select().from(suppliers).where(eq(suppliers.id, id)).get();
  }

  insert(data: NewSupplierRecord, executor: DrizzleExecutor = this.db) {
    return executor
      .insert(suppliers)
      .values({ ...data, createdAt: new Date() })
      .returning()
      .get();
  }
}
