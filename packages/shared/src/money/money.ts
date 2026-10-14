import { MAX_MONEY_AMOUNT } from "@stocknegozia/api-contracts";

/**
 * Utilidades monetarias compartidas por Desktop, Mobile y Mobile Mini — un único lugar para
 * formatear, parsear y redondear plata, en vez de que cada pantalla arme su propio
 * `Intl.NumberFormat` y su propio `Number(text)` (que con montos altos escritos como
 * "100.000.000" devolvía `NaN`, y con `$ 100.000.000,00` desbordaba gráficos y tarjetas).
 *
 * Convención es-AR: "." separa miles, "," separa decimales.
 */

/** Cantidad máxima de dígitos enteros que acepta un campo de monto. */
export const MAX_MONEY_INTEGER_DIGITS = String(Math.trunc(MAX_MONEY_AMOUNT)).length;

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerCurrencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Evita arrastrar errores de punto flotante (0,1 + 0,2) al operar con plata. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** `$ 100.000.000,00` — formato completo, para totales, tablas y recibos. */
export function formatMoney(value: number): string {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

/** `$ 100.000.000` — sin centavos, para lugares con poco espacio que igual piden el valor exacto. */
export function formatMoneyRounded(value: number): string {
  return integerCurrencyFormatter.format(Number.isFinite(value) ? Math.round(value) : 0);
}

function trimDecimal(value: number, decimals: number): string {
  // `toFixed` + quitar ceros sobrantes → "1,5" y no "1,50"; coma decimal es-AR.
  const fixed = value.toFixed(decimals);
  return (fixed.includes(".") ? fixed.replace(/\.?0+$/, "") : fixed).replace(".", ",");
}

/**
 * `$ 250k`, `$ 1,5M`, `$ 1.200M` — versión compacta para etiquetas de gráficos y chips, donde un
 * `$ 100.000.000,00` no entra. Implementado a mano (sin `notation: "compact"`) porque Hermes en
 * Android no soporta todas las opciones de `Intl` de forma confiable.
 */
export function formatMoneyCompact(value: number): string {
  if (!Number.isFinite(value)) return "$ 0";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);

  if (abs < 1_000) return `${sign}$ ${trimDecimal(abs, abs < 10 ? 2 : 0)}`;
  if (abs < 1_000_000) {
    const thousands = abs / 1_000;
    return `${sign}$ ${trimDecimal(thousands, thousands < 10 ? 1 : 0)}k`;
  }
  const millions = abs / 1_000_000;
  if (millions < 1_000) return `${sign}$ ${trimDecimal(millions, millions < 10 ? 2 : 1)}M`;
  // Miles de millones: "$ 1.250M" se lee mejor en es-AR que "1,25 B" (billón ≠ billion).
  return `${sign}$ ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(millions)}M`;
}

/**
 * Parsea lo que una persona escribe en un campo de monto, aceptando tanto el formato es-AR
 * ("100.000.000", "1.234,56", "1234,5") como el formato "de programador" ("1234.56",
 * "100000000"). Devuelve `null` si el texto no es un monto válido.
 *
 * Regla para el punto: si hay coma, la coma es el decimal y los puntos son miles. Si no hay coma
 * y hay UN solo punto seguido de 1 o 2 dígitos ("12.5", "1234.56"), es decimal; en cualquier otro
 * caso ("1.500", "100.000.000") los puntos son separadores de miles.
 */
export function parseMoneyInput(text: string): number | null {
  const cleaned = text.replace(/[\s$]/g, "").replace(/ARS/i, "");
  if (cleaned === "" || cleaned === "-") return null;
  if (!/^-?[\d.,]+$/.test(cleaned)) return null;

  let normalized: string;
  if (cleaned.includes(",")) {
    if (cleaned.indexOf(",") !== cleaned.lastIndexOf(",")) return null;
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    const dots = cleaned.split(".").length - 1;
    normalized = dots === 1 && /\.\d{1,2}$/.test(cleaned) ? cleaned : cleaned.replace(/\./g, "");
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? roundMoney(value) : null;
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formatea un campo de monto MIENTRAS se escribe: agrega los puntos de miles ("100000000" →
 * "100.000.000") y limita a 2 decimales y a `MAX_MONEY_INTEGER_DIGITS` dígitos enteros.
 *
 * `previous` distingue escribir de borrar: si la persona escribe un "." al final (el punto del
 * teclado numérico) se toma como coma decimal; si borra un dígito de "1.500" queda "150", nunca
 * "1,50".
 */
export function formatMoneyInputText(next: string, previous = ""): string {
  let text = next.replace(/[^\d.,]/g, "");
  if (text === "") return "";

  const isDeleting = text.length < previous.replace(/[^\d.,]/g, "").length;
  if (!text.includes(",")) {
    if (!isDeleting && text.endsWith(".") && !previous.endsWith(".")) {
      text = `${text.slice(0, -1)},`;
    } else if (!isDeleting && previous === "" && /^\d+\.\d{1,2}$/.test(text)) {
      // Texto pegado tipo "1234.56".
      text = text.replace(".", ",");
    }
  }

  const commaIndex = text.indexOf(",");
  const integerPart = (commaIndex === -1 ? text : text.slice(0, commaIndex)).replace(/\D/g, "");
  const decimalPart =
    commaIndex === -1
      ? null
      : text
          .slice(commaIndex + 1)
          .replace(/\D/g, "")
          .slice(0, 2);

  const integerDigits = integerPart.replace(/^0+(?=\d)/, "").slice(0, MAX_MONEY_INTEGER_DIGITS);
  const groupedInteger = groupThousands(
    integerDigits === "" && decimalPart !== null ? "0" : integerDigits,
  );
  return decimalPart === null ? groupedInteger : `${groupedInteger},${decimalPart}`;
}

/** Valor numérico → texto inicial de un campo de monto ("1234.5" → "1.234,5"). */
export function moneyToInputText(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  const [integer = "0", decimals] = roundMoney(value).toString().split(".");
  return decimals ? `${groupThousands(integer)},${decimals}` : groupThousands(integer);
}
