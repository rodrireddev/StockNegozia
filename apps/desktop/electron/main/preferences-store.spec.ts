// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PreferencesStore } from "./preferences-store";

describe("PreferencesStore", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "stocknegozia-preferences-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("default = system cuando no existe el archivo", () => {
    const store = new PreferencesStore(tmpDir);
    expect(store.load()).toEqual({ theme: "system" });
  });

  it("persiste y recupera la selección de light", () => {
    const store = new PreferencesStore(tmpDir);
    store.save({ theme: "light" });
    expect(new PreferencesStore(tmpDir).load()).toEqual({ theme: "light" });
  });

  it("persiste y recupera la selección de dark", () => {
    const store = new PreferencesStore(tmpDir);
    store.save({ theme: "dark" });
    expect(new PreferencesStore(tmpDir).load()).toEqual({ theme: "dark" });
  });

  it("cae al default si el archivo tiene JSON corrupto", () => {
    writeFileSync(path.join(tmpDir, "preferences.json"), "{ esto no es JSON");
    expect(new PreferencesStore(tmpDir).load()).toEqual({ theme: "system" });
  });

  it("cae al default si el valor de theme no es válido", () => {
    writeFileSync(path.join(tmpDir, "preferences.json"), JSON.stringify({ theme: "purple" }));
    expect(new PreferencesStore(tmpDir).load()).toEqual({ theme: "system" });
  });

  it("crea el directorio de destino si todavía no existe", () => {
    const nestedDir = path.join(tmpDir, "nested", "userData");
    const store = new PreferencesStore(nestedDir);
    store.save({ theme: "dark" });
    expect(new PreferencesStore(nestedDir).load()).toEqual({ theme: "dark" });
  });
});
