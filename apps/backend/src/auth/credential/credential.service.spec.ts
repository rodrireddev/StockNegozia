import { describe, expect, it } from "vitest";
import { CredentialService } from "./credential.service";

describe("CredentialService", () => {
  it("genera credentials distintas en cada llamada", () => {
    const service = new CredentialService();
    const a = service.generate();
    const b = service.generate();
    expect(a.credential).not.toBe(b.credential);
    expect(a.credentialHash).not.toBe(b.credentialHash);
  });

  it("el hash es determinístico para el mismo valor", () => {
    const service = new CredentialService();
    const { credential, credentialHash } = service.generate();
    expect(service.hash(credential)).toBe(credentialHash);
  });

  it("el hash nunca contiene la credential original", () => {
    const service = new CredentialService();
    const { credential, credentialHash } = service.generate();
    expect(credentialHash).not.toContain(credential);
  });
});
