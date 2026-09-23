import { Injectable } from "@nestjs/common";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/**
 * Hash de contraseñas con scrypt (`node:crypto`, sin dependencia nativa nueva) — compartido entre
 * `admin_users` y `users` (cuentas de comercio), son el mismo problema (contraseña elegida por una
 * persona, hace falta un hash lento con salt) aunque sus módulos de auth estén separados a
 * propósito. A diferencia de `CredentialService` de apps/backend (SHA-256 sobre un token de alta
 * entropía ya random), acá no alcanza un hash rápido.
 */
@Injectable()
export class PasswordService {
  hash(password: string): string {
    const salt = randomBytes(16);
    const derivedKey = scryptSync(password, salt, KEY_LENGTH);
    return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
  }

  verify(password: string, storedHash: string): boolean {
    const [saltHex, keyHex] = storedHash.split(":");
    if (!saltHex || !keyHex) return false;

    const salt = Buffer.from(saltHex, "hex");
    const storedKey = Buffer.from(keyHex, "hex");
    const derivedKey = scryptSync(password, salt, KEY_LENGTH);
    if (derivedKey.length !== storedKey.length) return false;
    return timingSafeEqual(derivedKey, storedKey);
  }
}
