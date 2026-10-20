import {
  PAYMENT_METHODS,
  type CardBrand,
  type CashAdjustmentDirection,
  type CashReasonGroupDto,
  type FinanceSeriesPointDto,
  type FinanceSummaryDto,
  type PaymentMethod,
  type PaymentMethodTotalDto,
  type SettlementDto,
  type TopProductDto,
} from "@stocknegozia/api-contracts";
import { roundMoney } from "../money/money";

/**
 * Agregaciones de Finanzas como funciones puras sobre filas planas — las usan el backend
 * (`FinanceService`) y Mobile Mini (SQLite local) con sus propias consultas, para que las dos
 * fuentes den exactamente los mismos números. Ver `FinanceSummaryDto` para el criterio de
 * separar ventas, compras, caja y cobros.
 */

export interface FinanceSaleLineRow {
  saleId: number;
  productId: number;
  productName: string;
  quantity: number;
  /** Subtotal de la línea (precio × cantidad). */
  revenue: number;
  /** Costo congelado × cantidad. */
  cost: number;
  createdAt: Date;
}

/** Un pago — o, para una venta sin pagos registrados, una fila con `method: null`. */
export interface FinancePaymentRow {
  paymentId: number | null;
  saleId: number;
  saleTotal: number;
  method: PaymentMethod | null;
  amount: number | null;
  surchargeAmount: number | null;
  feeAmount: number | null;
  cardBrand: CardBrand | null;
  installments: number | null;
  settlementDate: Date | null;
  createdAt: Date;
}

export interface FinancePurchaseRow {
  total: number;
  createdAt: Date;
}

export interface FinanceCashRow {
  direction: CashAdjustmentDirection;
  amount: number;
  reason: string;
  createdAt: Date;
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HOUR_MS = 3_600_000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function hourKey(date: Date): string {
  return `${dayKey(date)}T${pad(date.getHours())}`;
}

/** Hasta ~1 día de rango se agrupa por hora; más, por día. */
export function financeGranularity(from: Date, to: Date): "hour" | "day" {
  return to.getTime() - from.getTime() <= 25 * HOUR_MS ? "hour" : "day";
}

function emptyPoint(key: string, label: string): FinanceSeriesPointDto {
  return { key, label, revenue: 0, cost: 0, profit: 0, purchases: 0, withdrawals: 0 };
}

function buildBuckets(from: Date, to: Date, granularity: "hour" | "day") {
  const buckets = new Map<string, FinanceSeriesPointDto>();
  const cursor = new Date(from);
  if (granularity === "hour") {
    cursor.setMinutes(0, 0, 0);
    while (cursor <= to) {
      buckets.set(hourKey(cursor), emptyPoint(hourKey(cursor), `${cursor.getHours()}h`));
      cursor.setHours(cursor.getHours() + 1);
    }
  } else {
    cursor.setHours(0, 0, 0, 0);
    const shortRange = to.getTime() - from.getTime() <= 7 * 24 * HOUR_MS;
    while (cursor <= to) {
      const label = shortRange
        ? (DAY_LABELS[cursor.getDay()] ?? "")
        : `${cursor.getDate()}/${cursor.getMonth() + 1}`;
      buckets.set(dayKey(cursor), emptyPoint(dayKey(cursor), label));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return buckets;
}

function methodOrder(method: PaymentMethod | null): number {
  return method === null ? PAYMENT_METHODS.length : PAYMENT_METHODS.indexOf(method);
}

/** Total cobrado por medio de pago (incluye recargos y comisiones). */
export function buildPaymentMethodTotals(rows: FinancePaymentRow[]): PaymentMethodTotalDto[] {
  const totals = new Map<
    PaymentMethod | null,
    { amount: number; surcharge: number; fee: number; sales: Set<number> }
  >();
  for (const row of rows) {
    const bucket = totals.get(row.method) ?? { amount: 0, surcharge: 0, fee: 0, sales: new Set() };
    bucket.amount = roundMoney(bucket.amount + (row.method ? (row.amount ?? 0) : row.saleTotal));
    bucket.surcharge = roundMoney(bucket.surcharge + (row.surchargeAmount ?? 0));
    bucket.fee = roundMoney(bucket.fee + (row.feeAmount ?? 0));
    bucket.sales.add(row.saleId);
    totals.set(row.method, bucket);
  }
  return [...totals.entries()]
    .map(([method, bucket]) => ({
      method,
      amount: bucket.amount,
      salesCount: bucket.sales.size,
      surchargeAmount: bucket.surcharge,
      feeAmount: bucket.fee,
      netAmount: roundMoney(bucket.amount + bucket.surcharge - bucket.fee),
    }))
    .sort((a, b) => b.amount - a.amount || methodOrder(a.method) - methodOrder(b.method));
}

function toSettlement(row: FinancePaymentRow, now: Date): SettlementDto | null {
  if (row.paymentId === null || row.method === null || !row.settlementDate) return null;
  const amount = row.amount ?? 0;
  const surchargeAmount = row.surchargeAmount ?? 0;
  const feeAmount = row.feeAmount ?? 0;
  return {
    paymentId: row.paymentId,
    saleId: row.saleId,
    method: row.method,
    cardBrand: row.cardBrand,
    installments: row.installments,
    amount,
    surchargeAmount,
    feeAmount,
    netAmount: roundMoney(amount + surchargeAmount - feeAmount),
    createdAt: row.createdAt.toISOString(),
    settlementDate: row.settlementDate.toISOString(),
    status: row.settlementDate.getTime() > now.getTime() ? "pending" : "settled",
  };
}

/** Cobros con acreditación diferida (tarjeta/QR/transferencia), ordenados por fecha de
 *  acreditación — los pendientes primero el más próximo. */
export function buildSettlements(
  rows: FinancePaymentRow[],
  now: Date,
  status: "pending" | "settled" | "all" = "all",
): SettlementDto[] {
  return rows
    .map((row) => toSettlement(row, now))
    .filter((item): item is SettlementDto => item !== null)
    .filter((item) => status === "all" || item.status === status)
    .sort((a, b) =>
      status === "settled"
        ? b.settlementDate.localeCompare(a.settlementDate)
        : a.settlementDate.localeCompare(b.settlementDate),
    );
}

export interface FinanceSummaryInput {
  from: Date;
  to: Date;
  now: Date;
  saleLines: FinanceSaleLineRow[];
  /** Pagos de las ventas `completed` del período. */
  payments: FinancePaymentRow[];
  purchases: FinancePurchaseRow[];
  cashAdjustments: FinanceCashRow[];
  /** Pagos todavía no acreditados a `now`, de cualquier fecha (no sólo del período). */
  pendingPayments: FinancePaymentRow[];
  /** Pagos de cuenta corriente recibidos en el período (opcional: sin clientes, vacío). */
  customerPayments?: { amount: number }[];
  /** Saldo total adeudado por clientes a `now`. */
  outstandingReceivables?: number;
}

export function buildFinanceSummary(input: FinanceSummaryInput): FinanceSummaryDto {
  const granularity = financeGranularity(input.from, input.to);
  const buckets = buildBuckets(input.from, input.to, granularity);
  const keyOf = granularity === "hour" ? hourKey : dayKey;
  const bucketOf = (date: Date) => buckets.get(keyOf(date));

  const saleIds = new Set<number>();
  let revenue = 0;
  let cost = 0;
  let unitsSold = 0;
  for (const line of input.saleLines) {
    saleIds.add(line.saleId);
    revenue = roundMoney(revenue + line.revenue);
    cost = roundMoney(cost + line.cost);
    unitsSold += line.quantity;
    const bucket = bucketOf(line.createdAt);
    if (bucket) {
      bucket.revenue = roundMoney(bucket.revenue + line.revenue);
      bucket.cost = roundMoney(bucket.cost + line.cost);
      bucket.profit = roundMoney(bucket.revenue - bucket.cost);
    }
  }
  const profit = roundMoney(revenue - cost);

  let purchasesTotal = 0;
  for (const purchase of input.purchases) {
    purchasesTotal = roundMoney(purchasesTotal + purchase.total);
    const bucket = bucketOf(purchase.createdAt);
    if (bucket) bucket.purchases = roundMoney(bucket.purchases + purchase.total);
  }

  const cash = { withdrawals: 0, withdrawalsCount: 0, deposits: 0, depositsCount: 0 };
  for (const adjustment of input.cashAdjustments) {
    if (adjustment.direction === "OUT") {
      cash.withdrawals = roundMoney(cash.withdrawals + adjustment.amount);
      cash.withdrawalsCount += 1;
      const bucket = bucketOf(adjustment.createdAt);
      if (bucket) bucket.withdrawals = roundMoney(bucket.withdrawals + adjustment.amount);
    } else {
      cash.deposits = roundMoney(cash.deposits + adjustment.amount);
      cash.depositsCount += 1;
    }
  }

  // El fiado no es plata cobrada: se informa aparte, en `receivables`.
  const soldOnAccount = roundMoney(
    input.payments
      .filter((row) => row.method === "account")
      .reduce((sum, row) => sum + (row.amount ?? 0), 0),
  );
  const received = roundMoney(
    (input.customerPayments ?? []).reduce((sum, row) => sum + row.amount, 0),
  );
  const byMethod = buildPaymentMethodTotals(
    input.payments.filter((row) => row.method !== "account"),
  );
  const collected = roundMoney(byMethod.reduce((sum, row) => sum + row.amount, 0));
  const surcharges = roundMoney(byMethod.reduce((sum, row) => sum + row.surchargeAmount, 0));
  const fees = roundMoney(byMethod.reduce((sum, row) => sum + row.feeAmount, 0));
  const total = roundMoney(collected + surcharges);

  const pending = buildSettlements(input.pendingPayments, input.now, "pending");

  return {
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    granularity,
    sales: {
      count: saleIds.size,
      revenue,
      cost,
      profit,
      marginPercent: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0,
      averageTicket: saleIds.size > 0 ? roundMoney(revenue / saleIds.size) : 0,
      unitsSold,
    },
    purchases: { count: input.purchases.length, total: purchasesTotal },
    cash,
    collections: { total, surcharges, fees, net: roundMoney(total - fees), byMethod },
    receivables: {
      soldOnAccount,
      received,
      outstanding: roundMoney(input.outstandingReceivables ?? 0),
    },
    pendingSettlement: {
      amount: roundMoney(pending.reduce((sum, item) => sum + item.netAmount, 0)),
      count: pending.length,
      nextDate: pending[0]?.settlementDate ?? null,
    },
    series: [...buckets.values()],
  };
}

/** Productos que más ganancia dejaron en el período. */
export function buildTopProducts(lines: FinanceSaleLineRow[], limit = 10): TopProductDto[] {
  const byProduct = new Map<number, TopProductDto>();
  for (const line of lines) {
    const current = byProduct.get(line.productId) ?? {
      productId: line.productId,
      productName: line.productName,
      quantity: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    };
    current.quantity += line.quantity;
    current.revenue = roundMoney(current.revenue + line.revenue);
    current.cost = roundMoney(current.cost + line.cost);
    current.profit = roundMoney(current.revenue - current.cost);
    byProduct.set(line.productId, current);
  }
  return [...byProduct.values()].sort((a, b) => b.profit - a.profit).slice(0, limit);
}

function normalizeReason(reason: string): string {
  return reason.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Retiros/ingresos de caja agrupados por motivo — "Pago sueldo Juan" y "pago sueldo  juan" son el
 * mismo grupo. Se muestra el texto de la PRIMERA vez que se cargó (la más antigua) — con empate,
 * el que empieza con mayúscula —, sin depender del orden en que vengan las filas. Mayor monto
 * primero.
 */
export function groupCashByReason(rows: FinanceCashRow[]): CashReasonGroupDto[] {
  const groups = new Map<string, CashReasonGroupDto & { firstAt: number }>();
  for (const row of rows) {
    const key = `${row.direction}:${normalizeReason(row.reason)}`;
    const at = row.createdAt.getTime();
    const group = groups.get(key) ?? {
      direction: row.direction,
      reason: row.reason.trim(),
      total: 0,
      count: 0,
      firstAt: at,
    };
    // Empate (mismo segundo): gana el que empieza con mayúscula — suele ser el escrito con cuidado.
    const startsUpper = (text: string) => /^\p{Lu}/u.test(text.trim());
    if (
      at < group.firstAt ||
      (at === group.firstAt && startsUpper(row.reason) && !startsUpper(group.reason))
    ) {
      group.firstAt = at;
      group.reason = row.reason.trim();
    }
    group.total = roundMoney(group.total + row.amount);
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()]
    .map(({ firstAt: _firstAt, ...group }) => group)
    .sort((a, b) => b.total - a.total);
}
