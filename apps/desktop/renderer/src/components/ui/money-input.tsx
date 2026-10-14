import { formatMoneyInputText } from "@stocknegozia/shared";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  /** Texto formateado es-AR ("100.000.000,50") — convertir con `parseMoneyInput` al enviar. */
  value: string;
  onValueChange: (value: string) => void;
};

/**
 * Campo de monto: agrupa miles mientras se escribe ("100000000" → "100.000.000"), acepta coma o
 * el punto del teclado numérico como decimal y limita a 2 decimales. Reemplaza al
 * `<input type="number">`, que con montos altos era ilegible y no aceptaba "100.000.000".
 */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, className, placeholder = "0", ...props }, ref) => (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
        $
      </span>
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onValueChange(formatMoneyInputText(event.target.value, value))}
        className={cn("pl-7 tabular-nums", className)}
        {...props}
      />
    </div>
  ),
);
MoneyInput.displayName = "MoneyInput";
