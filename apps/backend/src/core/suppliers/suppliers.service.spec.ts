import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../test/create-test-db";
import type { Database } from "../../database/database.types";
import { SuppliersRepository } from "./suppliers.repository";
import { SuppliersService } from "./suppliers.service";

describe("SuppliersService", () => {
  let db: Database;
  let service: SuppliersService;

  beforeEach(() => {
    db = createTestDb();
    service = new SuppliersService(new SuppliersRepository(db));
  });

  it("crea un proveedor y lo recupera por id", () => {
    const created = service.create({ name: "ACME" });
    expect(created.name).toBe("ACME");
    expect(created.id).toBeGreaterThan(0);

    const found = service.findById(created.id);
    expect(found).toEqual(created);
  });

  it("lista proveedores ordenados por nombre", () => {
    service.create({ name: "Zeta" });
    service.create({ name: "Alfa" });

    const all = service.findAll();
    expect(all.map((s) => s.name)).toEqual(["Alfa", "Zeta"]);
  });

  it("lanza 404 al buscar un proveedor inexistente", () => {
    expect(() => service.findById(999_999)).toThrow();
  });

  describe("phone", () => {
    it("acepta un teléfono opcional y lo persiste", () => {
      const created = service.create({ name: "ACME", phone: "+54 11 1234-5678" });
      expect(created.phone).toBe("+54 11 1234-5678");

      const found = service.findById(created.id);
      expect(found.phone).toBe("+54 11 1234-5678");
    });

    it("sin teléfono, queda null — nunca inventado", () => {
      const created = service.create({ name: "ACME" });
      expect(created.phone).toBeNull();
    });
  });

  describe("update", () => {
    it("cambia el nombre y el teléfono de un proveedor existente", () => {
      const created = service.create({ name: "ACME", phone: "011 1111-1111" });

      const updated = service.update(created.id, { name: "ACME SRL", phone: "011 2222-2222" });

      expect(updated.name).toBe("ACME SRL");
      expect(updated.phone).toBe("011 2222-2222");
      expect(service.findById(created.id)).toEqual(updated);
    });

    it("permite quitar el teléfono (vuelve a null), no solo cambiarlo", () => {
      const created = service.create({ name: "ACME", phone: "011 1111-1111" });

      const updated = service.update(created.id, { name: "ACME" });

      expect(updated.phone).toBeNull();
    });

    it("lanza 404 al editar un proveedor inexistente", () => {
      expect(() => service.update(999_999, { name: "No existe" })).toThrow();
    });
  });
});
