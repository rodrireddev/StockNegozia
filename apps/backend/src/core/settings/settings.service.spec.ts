import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../test/create-test-db";
import type { Database } from "../../database/database.types";
import { SettingsRepository } from "./settings.repository";
import { SettingsService } from "./settings.service";

describe("SettingsService", () => {
  let db: Database;
  let settingsService: SettingsService;

  beforeEach(() => {
    db = createTestDb();
    settingsService = new SettingsService(new SettingsRepository(db));
  });

  it("devuelve businessName en null cuando nunca se configuró", () => {
    expect(settingsService.get()).toEqual({ businessName: null });
  });

  it("guarda y devuelve el nombre del negocio", () => {
    const result = settingsService.update({ businessName: "Almacén Doña Rosa" });

    expect(result).toEqual({ businessName: "Almacén Doña Rosa" });
    expect(settingsService.get()).toEqual({ businessName: "Almacén Doña Rosa" });
  });

  it("actualiza el nombre si ya existía uno guardado", () => {
    settingsService.update({ businessName: "Nombre viejo" });

    const result = settingsService.update({ businessName: "Nombre nuevo" });

    expect(result).toEqual({ businessName: "Nombre nuevo" });
  });

  it("permite volver a null para restaurar el default en el recibo", () => {
    settingsService.update({ businessName: "Almacén Doña Rosa" });

    const result = settingsService.update({ businessName: null });

    expect(result).toEqual({ businessName: null });
  });
});
