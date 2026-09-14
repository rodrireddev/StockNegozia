import { describe, expect, it } from "vitest";
import { getUserFriendlyError } from "./errors";

describe("getUserFriendlyError", () => {
  it("traduce un error de red (fetch no llegó a conectar) a un mensaje amigable", () => {
    const message = getUserFriendlyError(new TypeError("Failed to fetch"));

    expect(message).not.toMatch(/failed to fetch/i);
    expect(message.length).toBeGreaterThan(0);
  });

  it("conserva el mensaje del backend cuando ya es legible en español", () => {
    const message = getUserFriendlyError(
      new Error('Stock insuficiente para el producto "Coca-Cola 2L"'),
    );

    expect(message).toBe('Stock insuficiente para el producto "Coca-Cola 2L"');
  });

  it("reemplaza el mensaje genérico de status HTTP por uno amigable", () => {
    const message = getUserFriendlyError(new Error("Request to /sales failed with status 500"));

    expect(message).not.toMatch(/status 500/);
    expect(message).not.toMatch(/\/sales/);
  });

  it("da un mensaje por defecto ante un valor que no es un Error", () => {
    const message = getUserFriendlyError("algo inesperado");

    expect(message.length).toBeGreaterThan(0);
  });
});
