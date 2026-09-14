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
});
