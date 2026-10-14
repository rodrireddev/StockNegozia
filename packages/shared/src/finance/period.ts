/**
 * Períodos de las vistas de Finanzas — mismos presets en Desktop, Mobile y Mobile Mini. Fechas
 * LOCALES (no UTC): "hoy" es el día calendario del negocio.
 */
export type FinancePeriodPreset = "today" | "yesterday" | "week" | "month" | "lastMonth" | "year";

export const FINANCE_PERIOD_OPTIONS: { value: FinancePeriodPreset; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "week", label: "7 días" },
  { value: "month", label: "Este mes" },
  { value: "lastMonth", label: "Mes anterior" },
  { value: "year", label: "Este año" },
];

export const DEFAULT_FINANCE_PERIOD: FinancePeriodPreset = "week";

export interface FinancePeriod {
  preset: FinancePeriodPreset;
  from: Date;
  to: Date;
  /** "Hoy", "Últimos 7 días", "Octubre 2026"... */
  label: string;
}

export function isFinancePeriodPreset(value: unknown): value is FinancePeriodPreset {
  return FINANCE_PERIOD_OPTIONS.some((option) => option.value === value);
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" });

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function resolveFinancePeriod(
  preset: FinancePeriodPreset,
  now: Date = new Date(),
): FinancePeriod {
  switch (preset) {
    case "today":
      return { preset, from: startOfDay(now), to: endOfDay(now), label: "Hoy" };
    case "yesterday": {
      const day = new Date(now);
      day.setDate(day.getDate() - 1);
      return { preset, from: startOfDay(day), to: endOfDay(day), label: "Ayer" };
    }
    case "week": {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 6);
      return { preset, from, to: endOfDay(now), label: "Últimos 7 días" };
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { preset, from, to: endOfDay(now), label: capitalize(monthFormatter.format(from)) };
    }
    case "lastMonth": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      return { preset, from, to, label: capitalize(monthFormatter.format(from)) };
    }
    case "year": {
      const from = new Date(now.getFullYear(), 0, 1);
      return { preset, from, to: endOfDay(now), label: `Año ${now.getFullYear()}` };
    }
  }
}
