import { generateKeyPairSync, createSign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { splitSignedQuery, verifySsvSignature } from "./ssv-verifier";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

function sign(content: string): string {
  return createSign("SHA256").update(content, "utf8").sign(privateKey).toString("base64url");
}

describe("splitSignedQuery", () => {
  it("separa el contenido firmado de signature y key_id sin tocarlo", () => {
    const raw = "ad_unit=1&reward_item=Cr%C3%A9dito&user_id=u1&signature=abc_-&key_id=42";
    expect(splitSignedQuery(raw)).toEqual({
      content: "ad_unit=1&reward_item=Cr%C3%A9dito&user_id=u1",
      signature: "abc_-",
      keyId: "42",
    });
  });

  it("devuelve null si falta signature o key_id", () => {
    expect(splitSignedQuery("ad_unit=1&user_id=u1")).toBeNull();
    expect(splitSignedQuery("ad_unit=1&signature=abc")).toBeNull();
  });
});

describe("verifySsvSignature", () => {
  const content = "ad_unit=1&transaction_id=t1&user_id=u1";

  it("acepta una firma válida (base64 url-safe)", () => {
    expect(verifySsvSignature(content, sign(content), publicKeyPem)).toBe(true);
  });

  it("rechaza contenido alterado", () => {
    expect(verifySsvSignature(content.replace("u1", "u2"), sign(content), publicKeyPem)).toBe(
      false,
    );
  });

  it("rechaza basura sin tirar excepción", () => {
    expect(verifySsvSignature(content, "no-es-firma", publicKeyPem)).toBe(false);
  });
});
