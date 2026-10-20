import {
  CARD_BRANDS,
  MAX_CREDIT_CARD_INSTALLMENTS,
  MAX_ITEM_QUANTITY,
  MAX_MONEY_AMOUNT,
  MAX_SALE_PAYMENTS,
  PAYMENT_METHODS,
} from "@stocknegozia/api-contracts";
import { z } from "zod";

export const saleItemInputSchema = z.object({
  productId: z.coerce
    .number({ required_error: "El producto es obligatorio" })
    .int()
    .positive("El producto es inválido"),
  quantity: z.coerce
    .number({ required_error: "La cantidad es obligatoria" })
    .int("La cantidad debe ser un número entero")
    .positive("La cantidad debe ser mayor a 0")
    .max(MAX_ITEM_QUANTITY, "La cantidad es demasiado grande"),
});

export const moneyAmount = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} es inválido` })
    .finite(`${label} es inválido`)
    .positive(`${label} tiene que ser mayor a cero`)
    .max(MAX_MONEY_AMOUNT, `${label} supera el máximo permitido`);

/**
 * Un pago de la venta — ver `SalePaymentDto` (`@stocknegozia/api-contracts`). `amount` es
 * opcional SÓLO cuando la venta tiene un único pago: en ese caso el backend usa el total que él
 * mismo calcula (así un cambio de precio entre que se armó el carrito y se confirmó no rompe la
 * venta). Con pago mixto cada pago tiene que traer su monto y la suma tiene que dar el total.
 */
export const salePaymentInputSchema = z
  .object({
    method: z.enum(PAYMENT_METHODS, {
      required_error: "El medio de pago es obligatorio",
      invalid_type_error: "Medio de pago inválido",
    }),
    amount: moneyAmount("El monto").optional(),
    installments: z.coerce
      .number()
      .int("Las cuotas deben ser un número entero")
      .min(1, "Las cuotas deben ser al menos 1")
      .max(MAX_CREDIT_CARD_INSTALLMENTS, `Máximo ${MAX_CREDIT_CARD_INSTALLMENTS} cuotas`)
      .optional(),
    cardBrand: z.enum(CARD_BRANDS, { invalid_type_error: "Marca de tarjeta inválida" }).optional(),
    reference: z
      .string()
      .trim()
      .max(60, "La referencia no puede superar los 60 caracteres")
      .optional()
      .transform((value) => (value ? value : undefined)),
    amountReceived: moneyAmount("El monto recibido").optional(),
    /** `true` = no cobrar el recargo configurado para este medio/plan (promoción, cliente
     *  habitual...). La comisión del procesador se sigue estimando igual. */
    waiveSurcharge: z.boolean().optional(),
  })
  .superRefine((payment, ctx) => {
    if (payment.installments !== undefined && payment.method !== "credit_card") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installments"],
        message: "Las cuotas sólo aplican a tarjeta de crédito",
      });
    }
    if (
      payment.cardBrand !== undefined &&
      payment.method !== "credit_card" &&
      payment.method !== "debit_card"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cardBrand"],
        message: "La marca sólo aplica a pagos con tarjeta",
      });
    }
    if (payment.amountReceived !== undefined && payment.method !== "cash") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amountReceived"],
        message: "El monto recibido sólo aplica a pagos en efectivo",
      });
    }
  });

export const createSaleSchema = z
  .object({
    items: z.array(saleItemInputSchema).min(1, "La venta debe tener al menos un ítem"),
    /** Opcional — venta de mostrador anónima si se omite. */
    customerId: z.number().int().positive().optional(),
    /**
     * Opcional por compatibilidad con clientes viejos: una venta sin `payments` queda registrada
     * sin medio de pago ("Sin especificar"). Todas las pantallas de venta actuales lo envían.
     */
    payments: z
      .array(salePaymentInputSchema)
      .min(1, "Indicá al menos un medio de pago")
      .max(MAX_SALE_PAYMENTS, `Máximo ${MAX_SALE_PAYMENTS} pagos por venta`)
      .refine(
        (payments) => payments.length === 1 || payments.every((p) => p.amount !== undefined),
        {
          message: "Con pago mixto cada pago tiene que indicar su monto",
        },
      )
      .optional(),
  })
  .refine(
    (sale) => sale.customerId !== undefined || !sale.payments?.some((p) => p.method === "account"),
    { path: ["customerId"], message: "Para vender a cuenta corriente elegí un cliente" },
  );

export type SaleItemInput = z.infer<typeof saleItemInputSchema>;
export type SalePaymentInput = z.infer<typeof salePaymentInputSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
