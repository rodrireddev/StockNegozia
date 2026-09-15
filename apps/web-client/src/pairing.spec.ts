import { describe, expect, it } from "vitest";
import { parsePairingPayload } from "./pairing";

const validQrPayload = JSON.stringify({
  version: 1,
  type: "stocknegozia-pairing",
  host: "192.168.1.50",
  port: 38123,
  protocol: "http",
  pairingId: "pairing-1",
  token: "sn_token-largo",
  expiresAt: "2026-09-15T12:00:00.000Z",
});

describe("parsePairingPayload", () => {
  it("extrae pairingId y token de un JSON válido", () => {
    expect(parsePairingPayload(validQrPayload)).toEqual({
      pairingId: "pairing-1",
      token: "sn_token-largo",
    });
  });

  it("devuelve null si el texto no es JSON", () => {
    expect(parsePairingPayload("esto no es json")).toBeNull();
  });

  it("devuelve null si falta pairingId", () => {
    expect(parsePairingPayload(JSON.stringify({ token: "sn_token" }))).toBeNull();
  });

  it("devuelve null si falta token", () => {
    expect(parsePairingPayload(JSON.stringify({ pairingId: "pairing-1" }))).toBeNull();
  });

  it("devuelve null para un array o un primitivo", () => {
    expect(parsePairingPayload("[]")).toBeNull();
    expect(parsePairingPayload("42")).toBeNull();
  });

  it("devuelve null si pairingId o token están vacíos", () => {
    expect(parsePairingPayload(JSON.stringify({ pairingId: "", token: "" }))).toBeNull();
  });
});
