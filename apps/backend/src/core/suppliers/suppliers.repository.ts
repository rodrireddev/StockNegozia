import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database, DrizzleExecutor } from "../../database/database.types";
import { suppliers } from "../../database/schema";

export interface NewSupplierRecord {
  name: string;
  phone?: string;
}

/**
 * A diferencia de `NewSupplierRecord` (`phone` opcional, omitirlo en un INSERT ya deja la columna
 * en `NULL`), acá `phone` es `string | null` explícito: un UPDATE omitiendo la clave dejaría el
 * valor anterior sin tocar, pero `SuppliersService.update()` siempre refleja el estado completo
 * del formulario — incluido "sin teléfono" (`null`), que debe sobrescribir un teléfono previo.
 */
export interface UpdateSupplierRecord {
  name: string;
  phone: string | null;
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

  findByName(name: string, executor: DrizzleExecutor = this.db) {
    return executor.select().from(suppliers).where(eq(suppliers.name, name)).get();
  }

  insert(data: NewSupplierRecord, executor: DrizzleExecutor = this.db) {
    return executor
      .insert(suppliers)
      .values({ ...data, createdAt: new Date() })
      .returning()
      .get();
  }

  update(id: number, data: UpdateSupplierRecord, executor: DrizzleExecutor = this.db) {
    return executor.update(suppliers).set(data).where(eq(suppliers.id, id)).returning().get();
  }
}
