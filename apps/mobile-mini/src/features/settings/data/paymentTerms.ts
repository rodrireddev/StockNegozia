import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PaymentTermsDto } from "@stocknegozia/api-contracts";
import { DEFAULT_PAYMENT_TERMS } from "@stocknegozia/shared";
import { paymentTermsSchema, type PaymentTermsInput } from "@stocknegozia/validation";

/**
 * Condiciones de cobro (recargos, comisiones, acreditación) — en Mobile Mini no hay backend, se
 * guardan en el dispositivo (mismo criterio que `businessName.ts`). Si no hay nada guardado o lo
 * guardado ya no es válido, las de por defecto: nunca rompe una venta.
 */
const STORAGE_KEY = "stocknegozia.paymentTerms";

export async function getPaymentTerms(): Promise<PaymentTermsDto> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) return DEFAULT_PAYMENT_TERMS;
    const parsed = paymentTermsSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : DEFAULT_PAYMENT_TERMS;
  } catch {
    return DEFAULT_PAYMENT_TERMS;
  }
}

export async function savePaymentTerms(input: PaymentTermsInput): Promise<PaymentTermsDto> {
  const parsed = paymentTermsSchema.parse(input);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  return parsed;
}
