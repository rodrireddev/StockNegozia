import {
  MAX_CREDIT_CARD_INSTALLMENTS,
  MAX_CREDIT_PLANS,
  MAX_PAYMENT_TERMS_PERCENT,
  MAX_SETTLEMENT_DAYS,
} from "@stocknegozia/api-contracts";
import { z } from "zod";

const percent = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} es inválido` })
    .min(0, `${label} no puede ser negativo`)
    .max(MAX_PAYMENT_TERMS_PERCENT, `${label} no puede superar el ${MAX_PAYMENT_TERMS_PERCENT}%`);

const settlementDays = z.coerce
  .number({ invalid_type_error: "Los días de acreditación son inválidos" })
  .int("Los días de acreditación deben ser un número entero")
  .min(0, "Los días de acreditación no pueden ser negativos")
  .max(MAX_SETTLEMENT_DAYS, `Máximo ${MAX_SETTLEMENT_DAYS} días de acreditación`);

export const paymentPlanTermsSchema = z.object({
  surchargePercent: percent("El recargo"),
  feePercent: percent("La comisión"),
  settlementDays,
});

export const creditPlanTermsSchema = paymentPlanTermsSchema.extend({
  installments: z.coerce
    .number()
    .int("Las cuotas deben ser un número entero")
    .min(1, "Las cuotas deben ser al menos 1")
    .max(MAX_CREDIT_CARD_INSTALLMENTS, `Máximo ${MAX_CREDIT_CARD_INSTALLMENTS} cuotas`),
});

/** Body de `PUT /settings/payment-terms` — ver `PaymentTermsDto`. */
export const paymentTermsSchema = z.object({
  debit: paymentPlanTermsSchema,
  credit: z
    .array(creditPlanTermsSchema)
    .min(1, "Tiene que haber al menos un plan de crédito")
    .max(MAX_CREDIT_PLANS, `Máximo ${MAX_CREDIT_PLANS} planes de crédito`)
    .refine((plans) => plans.some((plan) => plan.installments === 1), {
      message: "Tiene que existir el plan de 1 pago",
    })
    .refine((plans) => new Set(plans.map((plan) => plan.installments)).size === plans.length, {
      message: "No se puede repetir la misma cantidad de cuotas",
    })
    .transform((plans) => [...plans].sort((a, b) => a.installments - b.installments)),
  qr: paymentPlanTermsSchema,
  transfer: paymentPlanTermsSchema,
  businessDays: z.boolean(),
});

export type PaymentTermsInput = z.infer<typeof paymentTermsSchema>;
