import type { TrackableMetricType } from "@stocknegozia/api-contracts";
import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../database/database.constants";
import type { Database, DrizzleExecutor } from "../database/database.types";
import { activityEvents } from "../database/schema";

@Injectable()
export class ActivityEventsRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  /**
   * `onConflictDoNothing` sobre `(userId, metricType, clientEventId)` es la idempotencia real:
   * reintentar el mismo evento (ej. `mobile-mini` reenviando desde el outbox offline tras un
   * fallo de red a mitad de camino) nunca duplica el conteo. Devuelve si insertó de verdad, para
   * que el caller sepa si tiene que reevaluar objetivos (un reintento no debería volver a evaluar).
   */
  async insert(
    data: { id: string; userId: string; metricType: TrackableMetricType; occurredOn: string; clientEventId: string },
    executor: DrizzleExecutor = this.db,
  ): Promise<boolean> {
    const inserted = await executor
      .insert(activityEvents)
      .values({ ...data, createdAt: new Date() })
      .onConflictDoNothing()
      .returning({ id: activityEvents.id });
    return inserted.length > 0;
  }

  /** Progreso de un objetivo programado: cuántos eventos de esta métrica caen en `[from, to]`. */
  async countInRange(
    userId: string,
    metricType: TrackableMetricType,
    from: string,
    to: string,
    executor: DrizzleExecutor = this.db,
  ): Promise<number> {
    const [row] = await executor
      .select({ count: sql<number>`count(*)` })
      .from(activityEvents)
      .where(
        and(
          eq(activityEvents.userId, userId),
          eq(activityEvents.metricType, metricType),
          gte(activityEvents.occurredOn, from),
          lte(activityEvents.occurredOn, to),
        ),
      );
    return Number(row?.count ?? 0);
  }
}
