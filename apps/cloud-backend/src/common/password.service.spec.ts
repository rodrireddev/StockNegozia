import { describe, expect, it } from "vitest";
import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const service = new PasswordService();

  it("verifica la contraseña correcta y rechaza otra", () => {
    const hash = service.hash("secreta123");
    expect(service.verify("secreta123", hash)).toBe(true);
    expect(service.verify("otra", hash)).toBe(false);
  });

  it("usa salt distinto en cada hash", () => {
    expect(service.hash("x")).not.toBe(service.hash("x"));
  });

  it("rechaza hashes mal formados", () => {
    expect(service.verify("x", "")).toBe(false);
    expect(service.verify("x", "solo-salt")).toBe(false);
  });
});
