import type { DeviceType } from "../auth/auth.contract";

/**
 * Ganancia de una línea de venta (`sale_items`) — `revenue`/`cost` salen de `unitPrice`/`unitCost`
 * ya congelados al momento de la venta (ver docs/inventory/STOCK_MOVEMENTS.md §Precio histórico,
 * mismo criterio para el costo), nunca de los precios ACTUALES del producto: una venta vieja no
 * puede cambiar de resultado porque después se actualizó un precio.
 */
export interface ProfitEntryDto {
  id: number;
  saleId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  /** `unitPrice * quantity` — lo que efectivamente cobró la venta por esta línea. */
  revenue: number;
  /** `unitCost * quantity`. */
  cost: number;
  /** `revenue - cost`. Puede ser negativa si se vendió por debajo del costo. */
  profit: number;
  /**
   * Dispositivo/vendedor que originó la venta — mismo dato que `StockMovementDto.deviceName`
   * (con el mismo reemplazo por "vendedor actual" en dispositivos desktop, ver
   * `describeMovementActor` en `@stocknegozia/shared`). `null` cuando no hay dispositivo
   * autenticado (`API_ACCESS_MODE=development`) o en ventas anteriores a este campo.
   */
  deviceName: string | null;
  deviceType: DeviceType | null;
  createdAt: string;
}

/** Ganancia agrupada por día — pensada para el gráfico semanal de la pantalla "Ganancias". */
export interface DailyProfitDto {
  /** `YYYY-MM-DD` en horario local del servidor. */
  date: string;
  /** Abreviatura del día en español ("Lun", "Mar"...), lista para el eje X del gráfico. */
  label: string;
  revenue: number;
  cost: number;
  profit: number;
}
