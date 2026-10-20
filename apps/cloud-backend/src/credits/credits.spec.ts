import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { CreditConfigService } from "../credit-config/credit-config.service";
import type { CreditsRepository } from "./credits.repository";
import { CreditsService } from "./credits.service";
import type { EntitlementsRepository } from "./entitlements.repository";
import { EntitlementsService } from "./entitlements.service";

interface Row {
  id: string;
  userId: string;
  amount: number;
  balanceAfter: number;
  idempotencyKey?: string;
}

function fakeCreditsRepository() {
  const rows: Row[] = [];
  const repo = {
    rows,
    async findLatestByUserId(userId: string) {
      return rows.filter((r) => r.userId === userId).at(-1);
    },
    async findByIdempotencyKey(key: string) {
      return rows.find((r) => r.idempotencyKey === key);
    },
    async runInTransaction<T>(cb: (tx: unknown) => Promise<T>) {
      return cb(undefined);
    },
    async insert(row: Row) {
      rows.push(row);
      return row;
    },
  };
  return repo;
}

describe("CreditsService", () => {
  it("encadena balanceAfter a partir del último movimiento", async () => {
    const repo = fakeCreditsRepository();
    const service = new CreditsService(repo as unknown as CreditsRepository);

    await service.grant("u1", 10, "rewarded_ad");
    await service.grant("u1", -3, "remove_ads_subscription");
    await service.grant("u2", 5, "rewarded_ad");

    expect(await service.getBalance("u1")).toBe(7);
    expect(await service.getBalance("u2")).toBe(5);
    expect(await service.getBalance("nadie")).toBe(0);
  });

  it("no acredita dos veces con la misma idempotencyKey", async () => {
    const repo = fakeCreditsRepository();
    const service = new CreditsService(repo as unknown as CreditsRepository);

    const first = await service.grant("u1", 50, "welcome_bonus", { idempotencyKey: "welcome:u1" });
    const second = await service.grant("u1", 50, "welcome_bonus", { idempotencyKey: "welcome:u1" });

    expect(second).toBe(first);
    expect(await service.getBalance("u1")).toBe(50);
  });
});

describe("EntitlementsService.purchase", () => {
  const DAY = 24 * 60 * 60 * 1000;

  function setup(balance: number, existingExpiresAt: Date | null = null) {
    const creditsRepo = fakeCreditsRepository();
    const credits = new CreditsService(creditsRepo as unknown as CreditsRepository);
    if (balance)
      creditsRepo.rows.push({ id: "seed", userId: "u1", amount: balance, balanceAfter: balance });
    const upserts: { expiresAt: Date }[] = [];
    const entitlementsRepo = {
      async findByUserAndType() {
        return existingExpiresAt ? { expiresAt: existingExpiresAt } : undefined;
      },
      async upsertExpiry(row: { expiresAt: Date }) {
        upserts.push(row);
      },
    };
    const config = { getValueByKey: async () => 100 };
    const service = new EntitlementsService(
      entitlementsRepo as unknown as EntitlementsRepository,
      credits,
      config as unknown as CreditConfigService,
    );
    return { service, credits, upserts };
  }

  it("rechaza con saldo insuficiente sin descontar", async () => {
    const { service, credits } = setup(99);
    await expect(service.purchase("u1", "remove_ads")).rejects.toBeInstanceOf(BadRequestException);
    expect(await credits.getBalance("u1")).toBe(99);
  });

  it("rechaza tipos desconocidos", async () => {
    const { service } = setup(1000);
    await expect(service.purchase("u1", "gratis_para_siempre")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("descuenta el costo y extiende desde el vencimiento vigente", async () => {
    const future = new Date(Date.now() + 10 * DAY);
    const { service, credits, upserts } = setup(150, future);

    const result = await service.purchase("u1", "cloud_backup");

    expect(result.creditsSpent).toBe(100);
    expect(await credits.getBalance("u1")).toBe(50);
    expect(upserts[0]!.expiresAt.getTime()).toBe(future.getTime() + 30 * DAY);
  });

  it("si ya venció, arranca los 30 días desde ahora", async () => {
    const { service, upserts } = setup(100, new Date(Date.now() - DAY));
    const before = Date.now();
    await service.purchase("u1", "cloud_backup");
    const expires = upserts[0]!.expiresAt.getTime();
    expect(expires).toBeGreaterThanOrEqual(before + 30 * DAY);
    expect(expires).toBeLessThanOrEqual(Date.now() + 30 * DAY);
  });
});
