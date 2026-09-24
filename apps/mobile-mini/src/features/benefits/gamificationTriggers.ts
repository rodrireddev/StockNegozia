import { claimSetupQuest, recordActivity } from "@/accounts/api/gamification.api";
import { fetchProducts } from "@/data/products";
import { salesRepository } from "@/features/sales/data/repository";
import { getBusinessName } from "@/features/settings/data/businessName";

/**
 * Fire-and-forget a propósito (doc §2/§3: "nunca bloquea nada, en ningún nivel") — vender o
 * cargar stock nunca debe esperar ni fallar por esto. Sin cuenta no hay nada que registrar
 * (el llamador chequea `useAccount().status === "authenticated"` antes de llamar), y cualquier
 * error de red se descarta silenciosamente: como mucho, el logro/racha se actualiza un poco
 * tarde la próxima vez que la acción se repita.
 */
export function fireSetupQuestClaim(questKey: string): void {
  claimSetupQuest(questKey).catch(() => {});
}

export function fireRecordActivity(): void {
  recordActivity().catch(() => {});
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
