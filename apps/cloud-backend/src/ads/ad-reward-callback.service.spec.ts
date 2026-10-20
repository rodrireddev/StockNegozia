import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { RewardedAdsService } from "../gamification/rewarded-ads.service";
import { AdRewardCallbackService } from "./ad-reward-callback.service";
import type { AdRewardCallbacksRepository } from "./ad-reward-callbacks.repository";
import type { SsvKeysService } from "./ssv-keys.service";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pem = publicKey.export({ type: "spki", format: "pem" }).toString();

function signedQuery(content: string, keyId = 7): string {
  const signature = createSign("SHA256")
    .update(content, "utf8")
    .sign(privateKey)
    .toString("base64url");
  return `${content}&signature=${signature}&key_id=${keyId}`;
}

const VALID_CONTENT =
  "ad_network=5450&ad_unit=123&reward_amount=1&reward_item=credito&transaction_id=tx1&user_id=u1";

function setup() {
  const inserted: { transactionId: string }[] = [];
  const claims: string[] = [];
  const repository = {
    async findByTransactionId(id: string) {
      return inserted.find((r) => r.transactionId === id);
    },
    async insert(row: { transactionId: string }) {
      inserted.push(row);
    },
  };
  const keys = { getKeys: async () => [{ keyId: 7, pem, base64: "" }] };
  const rewarded = {
    async claim(userId: string) {
      claims.push(userId);
      return { granted: true, ledgerEntryId: "l1" };
    },
  };
  const service = new AdRewardCallbackService(
    repository as unknown as AdRewardCallbacksRepository,
    keys as unknown as SsvKeysService,
    rewarded as unknown as RewardedAdsService,
  );
  return { service, inserted, claims };
}

describe("AdRewardCallbackService", () => {
  it("acredita un callback válido una sola vez aunque Google reintente", async () => {
    const { service, claims, inserted } = setup();
    await service.handle(signedQuery(VALID_CONTENT));
    await service.handle(signedQuery(VALID_CONTENT));
    expect(claims).toEqual(["u1"]);
    expect(inserted).toHaveLength(1);
  });

  it("rechaza firma alterada sin acreditar", async () => {
    const { service, claims } = setup();
    const tampered = signedQuery(VALID_CONTENT).replace("user_id=u1", "user_id=atacante");
    await expect(service.handle(tampered)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(claims).toEqual([]);
  });

  it("rechaza key_id desconocido", async () => {
    const { service } = setup();
    await expect(service.handle(signedQuery(VALID_CONTENT, 99))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rechaza callbacks mal formados o incompletos", async () => {
    const { service } = setup();
    await expect(service.handle("user_id=u1")).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.handle(signedQuery("ad_unit=1&user_id=u1"))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
