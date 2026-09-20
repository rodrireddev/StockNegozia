import { describe, expect, it } from "vitest";
import { isRapidKeystrokeBurst } from "./is-rapid-keystroke-burst";

describe("isRapidKeystrokeBurst", () => {
  it("no clasifica como escaneo con un solo carácter (nada para comparar todavía)", () => {
    expect(isRapidKeystrokeBurst([1000])).toBe(false);
  });

  it("no clasifica como escaneo una lista vacía", () => {
    expect(isRapidKeystrokeBurst([])).toBe(false);
  });

  it("clasifica como escaneo cuando todos los intervalos son rápidos (lector HID)", () => {
    expect(isRapidKeystrokeBurst([1000, 1005, 1009, 1013, 1018])).toBe(true);
  });

  it("no clasifica como escaneo cuando los intervalos son lentos (persona tipeando)", () => {
    expect(isRapidKeystrokeBurst([1000, 1220, 1410, 1650])).toBe(false);
  });

  it("un solo intervalo lento en medio de la serie descarta el resto", () => {
    expect(isRapidKeystrokeBurst([1000, 1005, 1300, 1305])).toBe(false);
  });

  it("respeta un umbral custom", () => {
    expect(isRapidKeystrokeBurst([1000, 1080], 100)).toBe(true);
    expect(isRapidKeystrokeBurst([1000, 1080], 50)).toBe(false);
  });
});
