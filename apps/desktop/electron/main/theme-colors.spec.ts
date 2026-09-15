// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  DARK_BACKGROUND_HEX,
  DARK_FOREGROUND_HEX,
  LIGHT_BACKGROUND_HEX,
  LIGHT_FOREGROUND_HEX,
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
});
