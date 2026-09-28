import { fetchProducts } from "@/data/products";
import { salesRepository } from "@/features/sales/data/repository";
import { getBusinessName } from "@/features/settings/data/businessName";
import { drainGamificationOutbox } from "./outboxSyncRunner";
import { gamificationOutboxRepository } from "./gamificationOutbox.repository";

/**
 * Encola local (nunca falla por estar offline) y dispara un intento de drenado inmediato, no
 * bloqueante — vender o cargar stock nunca debe esperar ni fallar por esto (doc §2/§3: "nunca
 * bloquea nada, en ningún nivel"). A diferencia de la versión anterior (POST directo,
 * fire-and-forget, se perdía para siempre sin red), el evento queda en `gamification_outbox` y se
 * reintenta solo hasta que se sincroniza — ver `outboxSyncRunner.ts`.
 *
 * `metricType` es una de las claves de la whitelist compartida
 * (`@stocknegozia/api-contracts/gamification/trackable-metrics`) — el server es quien cuenta el
 * progreso de cualquier objetivo que la use, esta función nunca cuenta nada localmente.
 */
export function fireRecordActivity(metricType: string): void {
  gamificationOutboxRepository.enqueueActivity(metricType);
  void drainGamificationOutbox();
}

export function fireSetupQuestClaim(questKey: string): void {
  gamificationOutboxRepository.enqueueSetupQuestClaim(questKey);
  void drainGamificationOutbox();
}

/**
 * `first_product`/`first_sale` normalmente se reclaman en el momento de crear/vender
 * (`useCreateProduct`/`useCreateSale`) — pero un comercio puede haber usado `mobile-mini` sin
 * cuenta durante semanas antes de registrarse, y esos productos/ventas ya existían cuando recién
 * se creó la cuenta. Sin este backfill, alguien que ya tenía todo lo que necesitaba antes de
 * registrarse podría no volver a crear ni un producto ni una venta nunca más, y perder esos
 * créditos para siempre — no por nada que hizo mal, solo por el orden en que pasaron las cosas
 * (doc §3, "caso: usuario existente se registra"). Se llama una vez por login/registro exitoso
 * (`AccountContext.applySession`); idempotente en el backend, así que llamarlo de nuevo en cada
 * login no duplica nada, solo repara el caso de alguien que se registró antes de que este backfill
 * existiera. Mismo criterio para `profile_complete` (¿ya tiene nombre de negocio guardado en
 * `AsyncStorage`?). `first_scan` queda afuera a propósito — a diferencia de productos/ventas/
 * nombre del negocio, un escaneo no deja ningún registro persistente en el dispositivo, no hay
 * nada que mirar retroactivamente.
 */
export async function backfillSetupQuestsFromLocalData(): Promise<void> {
  try {
    const products = await fetchProducts({});
    if (products.length > 0) fireSetupQuestClaim("first_product");
  } catch {
    // sin red o error local — se repara solo la próxima vez que se cree un producto/venta real.
  }

  try {
    if (salesRepository.findMany().length > 0) fireSetupQuestClaim("first_sale");
  } catch {
    // idem.
  }

  try {
    const businessName = await getBusinessName();
    if (businessName && businessName.trim().length > 0) fireSetupQuestClaim("profile_complete");
  } catch {
    // idem.
  }
}
