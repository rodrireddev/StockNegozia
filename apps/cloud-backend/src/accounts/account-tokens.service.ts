import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { AccountTokensRepository } from "./account-tokens.repository";

type TokenPurpose = "email_verification" | "password_reset";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Emisión/consumo de tokens de un solo uso (confirmación de email, reset de contraseña) — nunca
 * persiste el token crudo, solo su hash (ver `account_tokens` en el schema). El token crudo
 * únicamente existe en memoria durante `issue()` y en el mail que se manda con él.
 */
@Injectable()
export class AccountTokensService {
  constructor(
    @Inject(AccountTokensRepository) private readonly repository: AccountTokensRepository,
  ) {}

  async issue(userId: string, purpose: TokenPurpose, ttlMs: number): Promise<string> {
    await this.repository.invalidateAllUnconsumedForUser(userId, purpose);

    const rawToken = randomBytes(32).toString("base64url");
    await this.repository.insert({
      id: randomUUID(),
      userId,
      purpose,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return rawToken;
  }

  /** Devuelve el `userId` dueño del token y lo marca consumido — nunca vuelve a ser válido. */
  async consume(rawToken: string, purpose: TokenPurpose): Promise<string> {
    const row = await this.repository.findValidByHash(hashToken(rawToken), purpose);
    if (!row) throw new BadRequestException("Token inválido o vencido");

    await this.repository.markConsumed(row.id);
    return row.userId;
  }
}
