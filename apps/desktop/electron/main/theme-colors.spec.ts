// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  DARK_BACKGROUND_HEX,
  DARK_FOREGROUND_HEX,
  LIGHT_BACKGROUND_HEX,
  LIGHT_FOREGROUND_HEX,
  nativeThemeSourceFor,
  resolveBackgroundHex,
  resolveDark,
  resolveForegroundHex,
} from "./theme-colors";

describe("theme-colors", () => {
  it("resuelve el fondo claro/oscuro", () => {
    expect(resolveBackgroundHex(false)).toBe(LIGHT_BACKGROUND_HEX);
    expect(resolveBackgroundHex(true)).toBe(DARK_BACKGROUND_HEX);
  });

  it("resuelve el texto claro/oscuro", () => {
    expect(resolveForegroundHex(false)).toBe(LIGHT_FOREGROUND_HEX);
    expect(resolveForegroundHex(true)).toBe(DARK_FOREGROUND_HEX);
  });
});

describe("resolveDark", () => {
  it('"dark" siempre resuelve true, sin importar el SO', () => {
    expect(resolveDark("dark", false)).toBe(true);
    expect(resolveDark("dark", true)).toBe(true);
  });

  it('"light" siempre resuelve false, sin importar el SO', () => {
    expect(resolveDark("light", true)).toBe(false);
    expect(resolveDark("light", false)).toBe(false);
  });

  it('"system" refleja exactamente lo que reporta el SO', () => {
    expect(resolveDark("system", true)).toBe(true);
    expect(resolveDark("system", false)).toBe(false);
  });

  it("pastel y solarized resuelven claras, sin importar el SO", () => {
    expect(resolveDark("pastel", true)).toBe(false);
    expect(resolveDark("solarized", true)).toBe(false);
  });

  it("nord resuelve oscura, sin importar el SO", () => {
    expect(resolveDark("nord", false)).toBe(true);
  });
});

describe("nativeThemeSourceFor", () => {
  it('"system" pasa tal cual — es un valor nativo válido de themeSource', () => {
    expect(nativeThemeSourceFor("system")).toBe("system");
  });

  it('"light"/"dark" pasan tal cual', () => {
    expect(nativeThemeSourceFor("light")).toBe("light");
    expect(nativeThemeSourceFor("dark")).toBe("dark");
  });

  it("las paletas alternativas se mapean a light/dark nativo según su flag `dark`", () => {
    expect(nativeThemeSourceFor("pastel")).toBe("light");
    expect(nativeThemeSourceFor("solarized")).toBe("light");
    expect(nativeThemeSourceFor("nord")).toBe("dark");
  });
});
