import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";

/**
 * Genera y hashea credentials de dispositivo. La credential en texto plano solo existe en memoria
 * durante su generación y en la respuesta única de `POST /auth/bootstrap` — lo único que se
 * persiste (en `devices.credential_hash`) es un hash SHA-256, para que un volcado de la base de
 * datos no exponga credentials utilizables.
 */
@Injectable()
export class CredentialService {
  generate(): { credential: string; credentialHash: string } {
    const credential = `sn_${randomBytes(32).toString("base64url")}`;
    return { credential, credentialHash: this.hash(credential) };
  }

  hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}
