import { describe, expect, it } from "vitest";
import { backendEnvSchema } from "@stocknegozia/validation";

const parseHost = (PAIRING_HOST: string) => backendEnvSchema.safeParse({ PAIRING_HOST });

describe("backendEnvSchema.PAIRING_HOST", () => {
  it.each(["192.168.0.10", "10.0.0.1", "caja-1", "pc.local", " 192.168.1.5 "])(
    "acepta %s",
    (host) => {
      expect(parseHost(host).success).toBe(true);
    },
  );

  it.each([
    "",
    "http://192.168.0.10",
    "192.168.0.10:38123",
    "mi pc",
    "999.1.1.1",
    "localhost",
    "127.0.0.1",
    "-caja",
  ])("rechaza %j", (host) => {
    expect(parseHost(host).success).toBe(false);
  });

  it("sigue siendo opcional", () => {
    expect(backendEnvSchema.parse({}).PAIRING_HOST).toBeUndefined();
  });
});
