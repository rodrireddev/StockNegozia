import type { AchievementScheduleType } from "@stocknegozia/api-contracts";

/** Rango de fechas (ambas inclusive, YYYY-MM-DD) que cubre el período vigente para `occurredOn`. */
export interface PeriodRange {
  periodKey: string;
  from: string;
  to: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateString(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** ISO week (lunes a domingo) y su número de semana ISO-8601, calculados en UTC. */
function isoWeekOf(date: Date): { year: number; week: number; monday: Date; sunday: Date } {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // ISO: lunes=1 ... domingo=7. `getUTCDay()` da domingo=0, se remapea.
  const isoDayOfWeek = target.getUTCDay() === 0 ? 7 : target.getUTCDay();
  const monday = new Date(target);
  monday.setUTCDate(target.getUTCDate() - (isoDayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  // Número de semana ISO: se calcula a partir del jueves de esa semana (siempre cae en el año
  // correcto por definición ISO-8601, a diferencia del lunes o el domingo).
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);

  return { year: thursday.getUTCFullYear(), week, monday, sunday };
}

/**
 * Para `scheduleType = 'specific_date'` devuelve `null` si `occurredOn` no coincide con la fecha
 * configurada — ese logro simplemente no está vigente ese día, no es un error.
 */
export function periodRangeFor(
  scheduleType: AchievementScheduleType,
  occurredOn: string,
  scheduleConfig: { date: string } | null,
): PeriodRange | null {
  const [year, month, day] = occurredOn.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));

  switch (scheduleType) {
    case "daily":
      return { periodKey: occurredOn, from: occurredOn, to: occurredOn };
    case "weekly": {
      const { year: isoYear, week, monday, sunday } = isoWeekOf(date);
      return { periodKey: `${isoYear}-W${pad(week)}`, from: toDateString(monday), to: toDateString(sunday) };
    }
    case "monthly": {
      const from = `${year}-${pad(month!)}-01`;
      const lastDay = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
      return { periodKey: `${year}-${pad(month!)}`, from, to: `${year}-${pad(month!)}-${pad(lastDay)}` };
    }
    case "specific_date":
      if (!scheduleConfig || scheduleConfig.date !== occurredOn) return null;
      return { periodKey: scheduleConfig.date, from: scheduleConfig.date, to: scheduleConfig.date };
    case "once":
    case "streak":
      // No aplica a objetivos programados — `once`/`streak` son setup_quest/streak_milestone,
      // que no pasan por este cálculo de rango.
      return null;
  }
}
