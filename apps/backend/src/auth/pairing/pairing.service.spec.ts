import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSilentTestLogger } from "../../test/create-test-logger";
import { createTestDb } from "../../test/create-test-db";
import type { Database } from "../../database/database.types";
import { CredentialService } from "../credential/credential.service";
import { DevicesRepository } from "../devices/devices.repository";
import { DevicesService } from "../devices/devices.service";
import { PairingRepository } from "./pairing.repository";
import { PairingService } from "./pairing.service";

function createFakeConfigService(overrides: { pairingExpirationMinutes?: number } = {}): ConfigService {
  const config = {
    port: 38123,
    pairingExpirationMinutes: overrides.pairingExpirationMinutes ?? 5,
    pairingHostOverride: "192.168.1.50",
  };
  return { get: () => config } as unknown as ConfigService;
}

describe("PairingService", () => {
  let db: Database;
  let credentialService: CredentialService;
  let devicesService: DevicesService;
  let pairingRepository: PairingRepository;

  function createService(pairingExpirationMinutes?: number): PairingService {
    return new PairingService(
      pairingRepository,
      credentialService,
      devicesService,
      createFakeConfigService({ pairingExpirationMinutes }),
      createSilentTestLogger(),
    );
  }

  beforeEach(() => {
    db = createTestDb();
    credentialService = new CredentialService();
    devicesService = new DevicesService(new DevicesRepository(db), credentialService, createSilentTestLogger());
    pairingRepository = new PairingRepository(db);
  });

  describe("createPairing", () => {
    it("crea una sesión PENDING con token y código seguros, y un payload de QR correcto", () => {
      const service = createService();
      const result = service.createPairing();

      expect(result.status).toBe("pending");
      expect(result.pairingId).toBeTruthy();
      expect(result.verificationCode).toMatch(/^\d{6}$/);
      expect(result.expiresAt).toBeTruthy();

      expect(result.qr).toEqual({
        version: 1,
        type: "stocknegozia-pairing",
        host: "192.168.1.50",
        port: 38123,
        protocol: "http",
        pairingId: result.pairingId,
        token: expect.any(String),
        expiresAt: result.expiresAt,
      });
      // El token es un secreto random, no un UUID predecible.
      expect(result.qr.token.length).toBeGreaterThan(32);
    });

    it("nunca devuelve los hashes internos de la sesión", () => {
      const service = createService();
      const result = service.createPairing();

      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("tokenHash");
      expect(serialized).not.toContain("verificationCodeHash");
    });

    it("dos pairings generan tokens y códigos distintos", () => {
      const service = createService();
      const a = service.createPairing();
      const b = service.createPairing();

      expect(a.qr.token).not.toBe(b.qr.token);
      expect(a.verificationCode).not.toBe(b.verificationCode);
      expect(a.pairingId).not.toBe(b.pairingId);
    });

    it("respeta PAIRING_EXPIRATION_MINUTES para calcular expiresAt", () => {
      const service = createService(10);
      const before = Date.now();
      const result = service.createPairing();
      const expiresAt = new Date(result.expiresAt).getTime();

      expect(expiresAt - before).toBeGreaterThan(9 * 60_000);
      expect(expiresAt - before).toBeLessThanOrEqual(10 * 60_000 + 1000);
    });
  });

  describe("confirmPairing", () => {
    it("con datos válidos crea un device, devuelve su credential, y marca la sesión CONFIRMED", () => {
      const service = createService();
      const created = service.createPairing();

      const result = service.confirmPairing({
        pairingId: created.pairingId,
        token: created.qr.token,
        verificationCode: created.verificationCode,
        deviceName: "Juan Android",
        deviceType: "mobile",
      });

      expect(result.device.name).toBe("Juan Android");
      expect(result.device.type).toBe("mobile");
      expect(result.credential).toBeTruthy();

      // La credential recién emitida ya funciona a través de la misma infraestructura que usa el guard.
      const found = devicesService.findByCredential(result.credential);
      expect(found?.id).toBe(result.device.id);
      expect(found?.status).toBe("active");

      const session = pairingRepository.findById(created.pairingId);
      expect(session?.status).toBe("confirmed");
      expect(session?.deviceId).toBe(result.device.id);
    });

    it("usa valores por defecto razonables si no se envía deviceName/deviceType", () => {
      const service = createService();
      const created = service.createPairing();

      const result = service.confirmPairing({
        pairingId: created.pairingId,
        token: created.qr.token,
        verificationCode: created.verificationCode,
      });

      expect(result.device.name).toBeTruthy();
      expect(result.device.type).toBeTruthy();
    });

    it("un pairing ya confirmado no puede reutilizarse (single-use)", () => {
      const service = createService();
      const created = service.createPairing();
      service.confirmPairing({
        pairingId: created.pairingId,
        token: created.qr.token,
        verificationCode: created.verificationCode,
      });

      expect(() =>
        service.confirmPairing({
          pairingId: created.pairingId,
          token: created.qr.token,
          verificationCode: created.verificationCode,
        }),
      ).toThrow(UnauthorizedException);
    });

    it("un pairing expirado no puede confirmarse", () => {
      vi.useFakeTimers();
      try {
        const service = createService(5);
        const created = service.createPairing();

        vi.advanceTimersByTime(6 * 60_000);

        expect(() =>
          service.confirmPairing({
            pairingId: created.pairingId,
            token: created.qr.token,
            verificationCode: created.verificationCode,
          }),
        ).toThrow(UnauthorizedException);
      } finally {
        vi.useRealTimers();
      }
    });

    it("un token incorrecto falla con un error genérico, sin revelar el motivo", () => {
      const service = createService();
      const created = service.createPairing();

      let caught: unknown;
      try {
        service.confirmPairing({
          pairingId: created.pairingId,
          token: "sn_token-que-no-es",
          verificationCode: created.verificationCode,
        });
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(UnauthorizedException);
      expect(JSON.stringify((caught as UnauthorizedException).getResponse())).not.toContain("token");
    });

    it("un código de verificación incorrecto falla con un error genérico", () => {
      const service = createService();
      const created = service.createPairing();

      expect(() =>
        service.confirmPairing({
          pairingId: created.pairingId,
          token: created.qr.token,
          verificationCode: "000000",
        }),
      ).toThrow(UnauthorizedException);
    });

    it("un pairingId inexistente falla igual que uno inválido (sin revelar si existe)", () => {
      const service = createService();

      expect(() =>
        service.confirmPairing({
          pairingId: "00000000-0000-0000-0000-000000000000",
          token: "sn_cualquier-cosa-de-32-caracteres",
          verificationCode: "123456",
        }),
      ).toThrow(UnauthorizedException);
    });
  });

  describe("cancelPairing", () => {
    it("cancela una sesión PENDING", () => {
      const service = createService();
      const created = service.createPairing();

      service.cancelPairing(created.pairingId);

      expect(() =>
        service.confirmPairing({
          pairingId: created.pairingId,
          token: created.qr.token,
          verificationCode: created.verificationCode,
        }),
      ).toThrow(UnauthorizedException);
    });

    it("no puede cancelar una sesión inexistente", () => {
      const service = createService();
      expect(() => service.cancelPairing("nope")).toThrow(UnauthorizedException);
    });
  });
});
