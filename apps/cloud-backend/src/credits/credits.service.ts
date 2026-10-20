import { Inject, Injectable } from "@nestjs/common";
import type { CreditLedgerEntryDto } from "@stocknegozia/api-contracts";
import { randomUUID } from "node:crypto";
import { CreditsRepository } from "./credits.repository";

export type CreditReason = Parameters<CreditsRepository["insert"]>[0]["reason"];

export interface GrantCreditsOptions {
  reasonMetadata?: Record<string, unknown>;
  /**
   * Clave de idempotencia (ej. `welcome:<userId>`, `streak:<userId>:<day>`) — si ya existe una
   * fila con esta key, `grant` devuelve esa fila en vez de acreditar de nuevo. Solo hace falta para
   * recompensas "de una sola vez"; algo repetible (ej. rewarded_ad) no la necesita.
   */
  idempotencyKey?: string;
}

@Injectable()
export class CreditsService {
  constructor(@Inject(CreditsRepository) private readonly repository: CreditsRepository) {}

  async getBalance(userId: string): Promise<number> {
    const latest = await this.repository.findLatestByUserId(userId);
    return latest?.balanceAfter ?? 0;
  }

  async listLedger(userId: string, limit = 50): Promise<CreditLedgerEntryDto[]> {
    const rows = await this.repository.findRecentByUserId(userId, limit);
    return rows.map((row) => ({
      id: row.id,
      amount: row.amount,
      balanceAfter: row.balanceAfter,
      reason: row.reason,
      reasonMetadata: row.reasonMetadata,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  /**
   * Acredita (positivo) o gasta (negativo) créditos — único punto de escritura de
   * `credit_ledger` en todo el backend, para que `balanceAfter` nunca se desincronice del
   * historial real (doc §1: el ledger es la fuente de verdad del saldo, no un contador aparte).
   *
   * Lee el último saldo y escribe la fila nueva dentro de una misma transacción — cierra la
   * ventana de carrera de "dos requests leen el mismo saldo antes de que cualquiera escriba" en la
   * práctica (un solo dispositivo por usuario, acciones secuenciales), pero no es un lock real por
   * usuario (`SELECT ... FOR UPDATE` sobre `users`): dos escrituras concurrentes *sí* podrían
   * pisarse. Aceptable para v1 (doc §5, "mínimo indispensable"); si en producción aparecen
   * carreras reales, esto es lo primero a reforzar.
   */
  async grant(
    userId: string,
    amount: number,
    reason: CreditReason,
    options: GrantCreditsOptions = {},
  ) {
    if (options.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(options.idempotencyKey);
      if (existing) return existing;
    }

    return this.repository.runInTransaction(async (tx) => {
      const latest = await this.repository.findLatestByUserId(userId, tx);
      const currentBalance = latest?.balanceAfter ?? 0;
      return this.repository.insert(
        {
          id: randomUUID(),
          userId,
          amount,
          balanceAfter: currentBalance + amount,
          reason,
          reasonMetadata: options.reasonMetadata,
          idempotencyKey: options.idempotencyKey,
        },
        tx,
      );
    });
  }
}
