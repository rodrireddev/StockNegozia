import { beforeEach, describe, expect, it } from "vitest";
import {
  clearStoredCredential,
  getStoredCredential,
  setStoredCredential,
} from "./credential-store";

describe("credential-store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("devuelve null si no hay ninguna credential guardada", () => {
    expect(getStoredCredential()).toBeNull();
  });

  it("guarda y devuelve la credential", () => {
    setStoredCredential("sn_abc123");
    expect(getStoredCredential()).toBe("sn_abc123");
  });

  it("limpiar la credential hace que getStoredCredential vuelva a devolver null", () => {
    setStoredCredential("sn_abc123");
    clearStoredCredential();
    expect(getStoredCredential()).toBeNull();
  });

  it("sobrescribe una credential anterior", () => {
    setStoredCredential("sn_viejo");
    setStoredCredential("sn_nuevo");
    expect(getStoredCredential()).toBe("sn_nuevo");
  });
});
