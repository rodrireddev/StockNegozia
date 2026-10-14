import { formatMoneyInputText } from "@stocknegozia/shared";
import { TextField, type TextFieldProps } from "@/components/TextField";

export interface MoneyFieldProps extends Omit<
  TextFieldProps,
  "value" | "onChangeText" | "keyboardType"
> {
  /** Texto formateado es-AR ("100.000.000,50") — convertir con `parseMoneyInput` al guardar. */
  value: string;
  onChangeText: (value: string) => void;
}

/**
 * Campo de monto: agrupa miles mientras se escribe ("100000000" → "100.000.000") y acepta coma o
 * punto como decimal (el teclado `decimal-pad` de Android muestra uno u otro según el idioma).
 * Antes cada pantalla hacía `Number(texto)`, que con "100.000.000" devolvía `NaN`.
 */
export function MoneyField({ value, onChangeText, placeholder = "0", ...props }: MoneyFieldProps) {
  return (
    <TextField
      keyboardType="decimal-pad"
      placeholder={placeholder}
      value={value}
      onChangeText={(next) => onChangeText(formatMoneyInputText(next, value))}
      {...props}
    />
  );
}
