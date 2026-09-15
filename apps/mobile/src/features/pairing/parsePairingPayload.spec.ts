import { parsePairingPayload } from "./parsePairingPayload";

const validPayload = {
  version: 1,
  type: "stocknegozia-pairing",
  host: "192.168.1.30",
  port: 38123,
  protocol: "http",
  pairingId: "53ffa658-8ead-439c-ad17-c886e4feb750",
  token: "He6JDFgVjxHZcMCst4125NyqjlhInBot-aGm3hzg9iY",
  expiresAt: "2026-09-14T05:36:54.681Z",
};

describe("parsePairingPayload", () => {
  it("parsea un PairingQrPayload válido y arma la URL del backend automáticamente", () => {
    const result = parsePairingPayload(JSON.stringify(validPayload));
    expect(result).toEqual({
      pairingId: validPayload.pairingId,
      token: validPayload.token,
      backendUrl: "http://192.168.1.30:38123",
    });
  });

  it("devuelve null si el JSON está mal formado", () => {
    expect(parsePairingPayload("{not json")).toBeNull();
  });

  it("devuelve null si no es un objeto", () => {
    expect(parsePairingPayload("42")).toBeNull();
    expect(parsePairingPayload("null")).toBeNull();
  });

  it("devuelve null si version no es 1", () => {
    expect(parsePairingPayload(JSON.stringify({ ...validPayload, version: 2 }))).toBeNull();
  });

  it("devuelve null si falta pairingId", () => {
    const { pairingId: _pairingId, ...rest } = validPayload;
    expect(parsePairingPayload(JSON.stringify(rest))).toBeNull();
  });

  it("devuelve null si falta token", () => {
    const { token: _token, ...rest } = validPayload;
    expect(parsePairingPayload(JSON.stringify(rest))).toBeNull();
  });

  it("devuelve null si pairingId o token están vacíos", () => {
    expect(parsePairingPayload(JSON.stringify({ ...validPayload, pairingId: "" }))).toBeNull();
    expect(parsePairingPayload(JSON.stringify({ ...validPayload, token: "" }))).toBeNull();
  });

  it("devuelve null si falta host, port o protocol — hacen falta para armar la URL del backend", () => {
    const { host: _host, ...withoutHost } = validPayload;
    expect(parsePairingPayload(JSON.stringify(withoutHost))).toBeNull();
    const { port: _port, ...withoutPort } = validPayload;
    expect(parsePairingPayload(JSON.stringify(withoutPort))).toBeNull();
    expect(parsePairingPayload(JSON.stringify({ ...validPayload, protocol: "https" }))).toBeNull();
  });

  it("ignora campos extra no usados (expiresAt) sin fallar", () => {
    const { expiresAt: _expiresAt, ...rest } = validPayload;
    const result = parsePairingPayload(JSON.stringify(rest));
    expect(result).toEqual({
      pairingId: validPayload.pairingId,
      token: validPayload.token,
      backendUrl: "http://192.168.1.30:38123",
    });
  });
});
