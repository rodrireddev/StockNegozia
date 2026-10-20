import { beforeEach, describe, expect, it } from "vitest";
import { createSilentTestLogger } from "../../test/create-test-logger";
import { createTestDb } from "../../test/create-test-db";
import type { Database } from "../../database/database.types";
import { CashAdjustmentsRepository } from "./cash-adjustments.repository";
import { CashAdjustmentsService } from "./cash-adjustments.service";

describe("CashAdjustmentsService", () => {
  let db: Database;
  let service: CashAdjustmentsService;

  beforeEach(() => {
    db = createTestDb();
    service = new CashAdjustmentsService(
      new CashAdjustmentsRepository(db),
      createSilentTestLogger(),
    );
  });

  describe("create", () => {
    it("crea un retiro conservando dirección, monto y motivo", () => {
      const adjustment = service.create({
        direction: "OUT",
        amount: 3000,
        reason: "Pago sueldo Juan",
      });

      expect(adjustment.direction).toBe("OUT");
      expect(adjustment.amount).toBe(3000);
      expect(adjustment.reason).toBe("Pago sueldo Juan");
      expect(adjustment.createdAt).toBeTruthy();
    });

    it("crea un ingreso igual que un retiro, sólo cambia la dirección", () => {
      const adjustment = service.create({ direction: "IN", amount: 1000, reason: "Aporte propio" });
      expect(adjustment.direction).toBe("IN");
    });
  });

  describe("findMany", () => {
    it("lista los ajustes del más reciente al más viejo", () => {
      const first = service.create({ direction: "OUT", amount: 100, reason: "Primero" });
      const second = service.create({ direction: "OUT", amount: 200, reason: "Segundo" });

      const list = service.findMany();
      expect(list.map((a) => a.id)).toEqual([second.id, first.id]);
    });

    it("filtra por rango de fechas (from/to)", () => {
      service.create({ direction: "OUT", amount: 100, reason: "Ajuste" });

      const farFuture = new Date(Date.now() + 60_000);
      expect(service.findMany({ from: farFuture })).toHaveLength(0);

      const farPast = new Date(Date.now() - 60_000);
      expect(service.findMany({ from: farPast })).toHaveLength(1);
    });
  });
});
