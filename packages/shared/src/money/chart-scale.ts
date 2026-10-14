/**
 * Escala "linda" para los gráficos de barras de Ganancias (Desktop, Mobile y Mobile Mini): en vez
 * de escalar contra el valor máximo exacto (que deja el eje en números como 87.345.123), redondea
 * el tope a 1/2/2,5/5 × 10^n y genera las líneas guía intermedias. Funciona igual para $ 1.500 que
 * para $ 100.000.000.
 */
export interface ChartScale {
  /** Tope positivo del eje (≥ 0). */
  max: number;
  /** Piso negativo del eje (≤ 0). 0 si no hay valores negativos. */
  min: number;
  /** Valores de las líneas guía, de mayor a menor, incluyendo `max`, 0 y `min`. */
  ticks: number[];
}

function niceStep(rawStep: number): number {
  if (rawStep <= 0 || !Number.isFinite(rawStep)) return 1;
  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = 10 ** exponent;
  const fraction = rawStep / magnitude;
  const niceFraction =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return niceFraction * magnitude;
}

/**
 * @param values valores a graficar (pueden ser negativos).
 * @param tickCount cantidad aproximada de divisiones del lado positivo.
 */
export function buildChartScale(values: number[], tickCount = 4): ChartScale {
  const finite = values.filter((value) => Number.isFinite(value));
  const maxValue = Math.max(0, ...finite);
  const minValue = Math.min(0, ...finite);
  const span = Math.max(maxValue, Math.abs(minValue));
  if (span === 0) return { max: 1, min: 0, ticks: [1, 0] };

  const step = niceStep(span / tickCount);
  const max = maxValue > 0 ? Math.ceil(maxValue / step) * step : 0;
  const min = minValue < 0 ? Math.floor(minValue / step) * step : 0;

  // Por índice (no `value -= step`) para no acumular error de punto flotante.
  const divisions = Math.round((max - min) / step);
  const ticks = Array.from({ length: divisions + 1 }, (_, index) => {
    const value = max - index * step;
    return Math.abs(value) < step / 1e6 ? 0 : value;
  });
  return { max: max === 0 && min === 0 ? 1 : max, min, ticks };
}
