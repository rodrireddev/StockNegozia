import { CUSTOMER_PAYMENT_METHODS } from "@stocknegozia/api-contracts";
import { z } from "zod";
import { moneyAmount } from "../sales/sale.schema";

const optionalText = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : undefined));

export const createCustomerSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(1, "El nombre es obligatorio"),
  phone: optionalText,
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  documentNumber: optionalText,
  notes: optionalText,
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

/** Igual que proveedores: el formulario de edición reenvía el estado completo de todos los campos. */
export const updateCustomerSchema = createCustomerSchema;

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

/** `POST /customers/:id/payments` — el cliente paga (todo o parte de) su cuenta corriente. */
export const customerPaymentSchema = z.object({
  amount: moneyAmount("El monto"),
  method: z.enum(CUSTOMER_PAYMENT_METHODS, { message: "Medio de pago inválido" }),
  note: optionalText.pipe(
    z.string().max(120, "La nota no puede superar 120 caracteres").optional(),
  ),
});

export type CustomerPaymentInput = z.infer<typeof customerPaymentSchema>;
