import { createVerify } from "node:crypto";

export interface SplitSignedQuery {
  /** Los parámetros firmados, tal cual llegaron (sin decodificar) — nunca reserializar. */
  content: string;
  signature: string;
  keyId: string;
}

/**
 * Google (developers.google.com/admob/android/ssv): "The last two query parameters of rewarded
 * SSV callbacks are always `signature` and `key_id`, in that order. The remaining query
 * parameters specify the content to be verified" + "Content... should not be modified in any way
 * (including keeping the order of query parameters)". Por eso se recorta el string crudo tal cual
 * llegó (antes de cualquier parseo) — reserializar desde un objeto ya decodificado podría no
 * coincidir byte a byte con lo que Google firmó (ej. escapes distintos en `reward_item`).
 */
export function splitSignedQuery(rawQuery: string): SplitSignedQuery | null {
  const marker = "&signature=";
  const index = rawQuery.indexOf(marker);
  if (index === -1) return null;

  const content = rawQuery.slice(0, index);
  const tail = new URLSearchParams(rawQuery.slice(index + 1));
  const signature = tail.get("signature");
  const keyId = tail.get("key_id");
  if (!signature || !keyId) return null;

  return { content, signature, keyId };
}

/**
 * La documentación de Google no deja 100% claro si `signature` viaja en base64 estándar o
 * "url-safe" (distintas integraciones de referencia hacen cada cosa) — normalizar los caracteres
 * antes de decodificar cubre ambos casos sin tener que adivinar cuál es.
 */
function normalizeBase64(value: string): string {
  return value.replace(/-/g, "+").replace(/_/g, "/");
}

/**
 * ECDSA + SHA256 + DER (doc de Google, confirmado también por el tipo de clave pública real que
 * expone `verifier-keys.json`: una clave EC, no RSA) — Node infiere el algoritmo desde el tipo de
 * la clave PEM, y `dsaEncoding` default de `verify()` ya es DER.
 */
export function verifySsvSignature(
  content: string,
  signature: string,
  publicKeyPem: string,
): boolean {
  const signatureBuffer = Buffer.from(normalizeBase64(signature), "base64");
  const verifier = createVerify("SHA256");
  verifier.update(content, "utf8");
  try {
    return verifier.verify(publicKeyPem, signatureBuffer);
  } catch {
    return false;
  }
}
