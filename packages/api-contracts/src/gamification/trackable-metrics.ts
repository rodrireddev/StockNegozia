/**
 * Whitelist única de métricas de negocio que un logro programado (`scheduled_goal`) puede usar
 * como objetivo — revisada contra el código real de `mobile-mini` (tablas locales + hooks de
 * creación/edición), no una lista elegida a mano. Fuente de verdad compartida por: el enum de
 * Postgres (`activity_metric_type`, `apps/cloud-backend/src/database/schema/activity-events.ts`),
 * la validación zod del body de `POST /gamification/activity`, y el dropdown de "métrica" del
 * formulario de logros en `apps/admin-panel`.
 *
 * Agregar una métrica nueva acá es solo la mitad del trabajo: también hace falta cablear el call
 * site real en `mobile-mini` que dispare `fireRecordActivity(metricType)` — una métrica listada
 * sin su call site conectado dejaría que un admin arme un logro que nunca puede completarse.
 */
export const TRACKABLE_METRICS = [
  {
    key: "sale_completed",
    label: "Venta registrada",
    description: "Una venta completada (no cancelada).",
  },
  {
    key: "stock_adjustment_in",
    label: "Ajuste de stock — entrada",
    description: "Un ajuste manual de stock que suma unidades.",
  },
  {
    key: "stock_adjustment_out",
    label: "Ajuste de stock — salida",
    description: "Un ajuste manual de stock que resta unidades.",
  },
  {
    key: "purchase_registered",
    label: "Compra registrada",
    description: "Una compra a proveedor registrada.",
  },
  {
    key: "cash_adjustment_in",
    label: "Ingreso de caja",
    description: "Un movimiento de caja que suma efectivo (no ligado a una venta).",
  },
  {
    key: "cash_adjustment_out",
    label: "Egreso de caja",
    description: "Un movimiento de caja que resta efectivo (no ligado a una compra).",
  },
  {
    key: "product_created",
    label: "Producto nuevo cargado",
    description: "Un producto nuevo agregado al catálogo.",
  },
  {
    key: "product_scanned",
    label: "Código escaneado",
    description: "Un escaneo de código de barras/QR, en cualquier pantalla.",
  },
  {
    key: "supplier_created",
    label: "Proveedor nuevo cargado",
    description: "Un proveedor nuevo agregado.",
  },
  {
    key: "rewarded_ad_viewed",
    label: "Anuncio visto",
    description:
      "Un rewarded ad visto y acreditado (POST /gamification/rewarded-ad/claim). A diferencia del resto, " +
      "este evento lo genera el server, no un ping del cliente — no pasa por la cola offline de mobile-mini " +
      "(ver mobile-mini) porque ver un anuncio necesita red igual.",
  },
] as const;

export type TrackableMetricType = (typeof TRACKABLE_METRICS)[number]["key"];

export const TRACKABLE_METRIC_KEYS = TRACKABLE_METRICS.map(
  (metric) => metric.key,
) as TrackableMetricType[];

export function isTrackableMetricType(value: string): value is TrackableMetricType {
  return (TRACKABLE_METRIC_KEYS as string[]).includes(value);
}
