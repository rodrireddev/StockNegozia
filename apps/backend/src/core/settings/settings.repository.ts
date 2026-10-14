import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database, DrizzleExecutor } from "../../database/database.types";
import { appMeta } from "../../database/schema";

const BUSINESS_NAME_KEY = "businessName";
const PAYMENT_TERMS_KEY = "paymentTerms";

/** `app_meta` es un key-value store genérico ya definido en el schema pero sin uso hasta ahora —
 *  sirve tal cual para settings de una sola instancia como esta, sin necesitar tabla ni migración
 *  nuevas. */
@Injectable()
export class SettingsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  getBusinessName(executor: DrizzleExecutor = this.db): string | null {
    return this.getValue(BUSINESS_NAME_KEY, executor);
  }

  /** Condiciones de cobro como JSON — `null` si nunca se configuraron. */
  getPaymentTermsJson(executor: DrizzleExecutor = this.db): string | null {
    return this.getValue(PAYMENT_TERMS_KEY, executor);
  }

  setPaymentTermsJson(value: string, executor: DrizzleExecutor = this.db): void {
    this.setValue(PAYMENT_TERMS_KEY, value, executor);
  }

  private getValue(key: string, executor: DrizzleExecutor): string | null {
    const row = executor.select().from(appMeta).where(eq(appMeta.key, key)).get();
    return row?.value ?? null;
  }

  private setValue(key: string, value: string, executor: DrizzleExecutor): void {
    const updatedAt = new Date();
    const existing = executor.select().from(appMeta).where(eq(appMeta.key, key)).get();
    if (existing) {
      executor.update(appMeta).set({ value, updatedAt }).where(eq(appMeta.key, key)).run();
    } else {
      executor.insert(appMeta).values({ key, value, updatedAt }).run();
    }
  }

  setBusinessName(value: string | null, executor: DrizzleExecutor = this.db): void {
    if (value === null) {
      executor.delete(appMeta).where(eq(appMeta.key, BUSINESS_NAME_KEY)).run();
      return;
    }

    const existing = executor
      .select()
      .from(appMeta)
      .where(eq(appMeta.key, BUSINESS_NAME_KEY))
      .get();
    const updatedAt = new Date();

    if (existing) {
      executor
        .update(appMeta)
        .set({ value, updatedAt })
        .where(eq(appMeta.key, BUSINESS_NAME_KEY))
        .run();
    } else {
      executor.insert(appMeta).values({ key: BUSINESS_NAME_KEY, value, updatedAt }).run();
    }
  }
}
