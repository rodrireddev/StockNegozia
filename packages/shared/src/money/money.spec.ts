import { describe, expect, it } from "vitest";
import { buildChartScale } from "./chart-scale";
import {
  formatMoney,
  formatMoneyCompact,
  formatMoneyInputText,
  moneyToInputText,
  parseMoneyInput,
  roundMoney,
} from "./money";

// Intl en Node usa espacio duro entre "$" y el número.
const normalizeSpaces = (text: string) => text.replace(/\s/g, " ");

describe("parseMoneyInput", () => {
  it.each([
    ["100000000", 100_000_000],
    ["100.000.000", 100_000_000],
    ["1.234,56", 1234.56],
    ["1234,5", 1234.5],
    ["1234.56", 1234.56],
    ["12.5", 12.5],
    ["1.500", 1500],
    ["$ 2.000.000,99", 2_000_000.99],
    ["0", 0],
  ])("parsea %s", (text, expected) => {
    expect(parseMoneyInput(text)).toBe(expected);
  });

  it.each(["", "abc", "1,2,3", "1..2,", "-"])("rechaza %s", (text) => {
    expect(parseMoneyInput(text)).toBeNull();
  });
});

describe("formatMoneyInputText", () => {
  it("agrupa miles mientras se escribe", () => {
    expect(formatMoneyInputText("100000000")).toBe("100.000.000");
    expect(formatMoneyInputText("1.0000", "1.000")).toBe("10.000");
  });

  it("toma el punto final como coma decimal al escribir", () => {
    expect(formatMoneyInputText("1.500.", "1.500")).toBe("1.500,");
    expect(formatMoneyInputText("1.500,557", "1.500,55")).toBe("1.500,55");
  });

  it("al borrar no reinterpreta los puntos de miles como decimales", () => {
    expect(formatMoneyInputText("1.50", "1.500")).toBe("150");
  });

  it("acepta texto pegado con punto decimal", () => {
    expect(formatMoneyInputText("1234.56")).toBe("1.234,56");
  });

  it("limita los dígitos enteros", () => {
    expect(formatMoneyInputText("12345678901234567")).toBe("123.456.789.012");
  });

  it("vuelve a parsearse al mismo número", () => {
    expect(parseMoneyInput(formatMoneyInputText("100000000"))).toBe(100_000_000);
    expect(parseMoneyInput(moneyToInputText(1234567.5))).toBe(1234567.5);
  });
});

describe("formatMoney / formatMoneyCompact", () => {
  it("formatea montos altos completos", () => {
    expect(normalizeSpaces(formatMoney(100_000_000))).toBe("$ 100.000.000,00");
  });

  it.each([
    [0, "$ 0"],
    [950, "$ 950"],
    [1_500, "$ 1,5k"],
    [250_000, "$ 250k"],
    [1_500_000, "$ 1,5M"],
    [100_000_000, "$ 100M"],
    [-2_000_000, "-$ 2M"],
    [1_250_000_000, "$ 1.250M"],
  ])("compacta %d como %s", (value, expected) => {
    expect(normalizeSpaces(formatMoneyCompact(value))).toBe(expected);
  });

  it("redondea a centavos sin errores de punto flotante", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1.005)).toBe(1.01);
  });
});

describe("buildChartScale", () => {
  it("redondea el tope a un valor lindo", () => {
    const scale = buildChartScale([87_345_123, 12_000_000]);
    expect(scale.max).toBe(100_000_000);
    expect(scale.min).toBe(0);
    expect(scale.ticks).toEqual([100_000_000, 75_000_000, 50_000_000, 25_000_000, 0]);
  });

  it("incluye la zona negativa", () => {
    const scale = buildChartScale([1000, -400]);
    expect(scale.max).toBe(1000);
    expect(scale.min).toBe(-500);
    expect(scale.ticks.at(-1)).toBe(-500);
    expect(scale.ticks).toContain(0);
  });

  it("sin datos devuelve una escala válida", () => {
    expect(buildChartScale([])).toEqual({ max: 1, min: 0, ticks: [1, 0] });
  });
});
