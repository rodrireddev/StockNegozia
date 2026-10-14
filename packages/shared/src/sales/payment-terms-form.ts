import type { PaymentPlanTermsDto, PaymentTermsDto } from "@stocknegozia/api-contracts";
import { parseMoneyInput } from "../money/money";

/**
 * Estado del formulario "Medios de pago: recargos, comisiones y plazos" (Configuración) — textos
 * tal cual se escriben, convertidos a `PaymentTermsDto` al guardar. Compartido por Desktop, Mobile
 * y Mobile Mini; cada app sólo renderiza.
 */
export interface PlanTermsFormRow {
  key: string;
  /** Sólo planes de crédito. */
  installments: string;
  surchargePercent: string;
  feePercent: string;
  settlementDays: string;
}

export interface PaymentTermsForm {
  debit: PlanTermsFormRow;
  credit: PlanTermsFormRow[];
  qr: PlanTermsFormRow;
  transfer: PlanTermsFormRow;
  businessDays: boolean;
}

let rowCounter = 0;

function numberText(value: number): string {
  return String(value).replace(".", ",");
}

function toRow(plan: PaymentPlanTermsDto, installments = 1): PlanTermsFormRow {
  rowCounter += 1;
  return {
    key: `plan-${rowCounter}`,
    installments: String(installments),
    surchargePercent: numberText(plan.surchargePercent),
    feePercent: numberText(plan.feePercent),
    settlementDays: String(plan.settlementDays),
  };
}

export function paymentTermsToForm(terms: PaymentTermsDto): PaymentTermsForm {
  return {
    debit: toRow(terms.debit),
    credit: terms.credit.map((plan) => toRow(plan, plan.installments)),
    qr: toRow(terms.qr),
    transfer: toRow(terms.transfer),
    businessDays: terms.businessDays,
  };
}

/** Nueva fila de plan de crédito con la siguiente cantidad de cuotas libre. */
export function newCreditPlanRow(existing: PlanTermsFormRow[]): PlanTermsFormRow {
  const used = new Set(existing.map((row) => Number(row.installments)));
  const next = [3, 6, 9, 12, 18, 24, 36, 48].find((option) => !used.has(option)) ?? 2;
  return toRow({ surchargePercent: 0, feePercent: 0, settlementDays: 10 }, next);
}

function parseNumber(text: string): number | string {
  // Acepta "15", "15,5" o "15.5"; si no se puede parsear se devuelve el texto y la validación
  // (zod) muestra "inválido".
  return parseMoneyInput(text.replace("%", "")) ?? text;
}

function rowToPlan(row: PlanTermsFormRow) {
  return {
    surchargePercent: parseNumber(row.surchargePercent),
    feePercent: parseNumber(row.feePercent),
    settlementDays: parseNumber(row.settlementDays),
  };
}

/** Payload para `paymentTermsSchema` — sin validar (eso lo hace zod, con mensajes en español). */
export function paymentTermsFormToInput(form: PaymentTermsForm) {
  return {
    debit: rowToPlan(form.debit),
    credit: form.credit.map((row) => ({
      installments: parseNumber(row.installments),
      ...rowToPlan(row),
    })),
    qr: rowToPlan(form.qr),
    transfer: rowToPlan(form.transfer),
    businessDays: form.businessDays,
  };
}
