import { asc, eq } from "drizzle-orm";
import { db } from "@/database/client";
import type { DrizzleExecutor } from "@/database/database.types";
import { suppliers } from "@/database/schema";

export interface NewSupplierRecord {
  name: string;
  phone?: string;
}

/** A diferencia de `NewSupplierRecord`, acá `phone` es `string | null` explícito — un UPDATE debe
 *  reflejar siempre el estado completo del formulario, incluido "sin teléfono" (ver
 *  `suppliersService.update`). */
export interface UpdateSupplierRecord {
  name: string;
  phone: string | null;
}

export const suppliersRepository = {
  findAll(executor: DrizzleExecutor = db) {
    return executor.select().from(suppliers).orderBy(asc(suppliers.name)).all();
  },

  findById(id: number, executor: DrizzleExecutor = db) {
    return executor.select().from(suppliers).where(eq(suppliers.id, id)).get();
  },

  findByName(name: string, executor: DrizzleExecutor = db) {
    return executor.select().from(suppliers).where(eq(suppliers.name, name)).get();
  },

  insert(data: NewSupplierRecord, executor: DrizzleExecutor = db) {
    return executor
      .insert(suppliers)
      .values({ ...data, createdAt: new Date() })
      .returning()
      .get();
  },

  update(id: number, data: UpdateSupplierRecord, executor: DrizzleExecutor = db) {
    return executor.update(suppliers).set(data).where(eq(suppliers.id, id)).returning().get();
  },
};
