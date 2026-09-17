import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initializeTheme, setThemePreference, useThemeStore } from "./theme-store";

function mockThemeApi() {
  const listeners: Array<(dark: boolean) => void> = [];
  const get = vi.fn();
  const set = vi.fn();
  const onUpdated = vi.fn((callback: (dark: boolean) => void) => {
    listeners.push(callback);
    return () => {
      const index = listeners.indexOf(callback);
      if (index >= 0) listeners.splice(index, 1);
    };
  });
  return {
    api: { get, set, onUpdated },
    emitUpdate: (dark: boolean) => listeners.forEach((listener) => listener(dark)),
  };
}

describe("theme-store", () => {
  beforeEach(() => {
    useThemeStore.setState({ preference: "system", resolvedDark: false });
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("default = system antes de inicializar", () => {
    expect(useThemeStore.getState()).toEqual({ preference: "system", resolvedDark: false });
  });

  it("initializeTheme hidrata el store y aplica la clase dark si corresponde", async () => {
    const { api } = mockThemeApi();
    api.get.mockResolvedValue({ preference: "dark", resolvedDark: true });
    window.theme = api as unknown as Window["theme"];

    await initializeTheme();

    expect(useThemeStore.getState()).toEqual({ preference: "dark", resolvedDark: true });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("initializeTheme no agrega la clase dark si resolvedDark es false", async () => {
    const { api } = mockThemeApi();
    api.get.mockResolvedValue({ preference: "light", resolvedDark: false });
    window.theme = api as unknown as Window["theme"];

    await initializeTheme();

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("setThemePreference selecciona light y lo refleja sin reiniciar", async () => {
    const { api } = mockThemeApi();
    api.get.mockResolvedValue({ preference: "system", resolvedDark: true });
    api.set.mockResolvedValue({ preference: "light", resolvedDark: false });
    window.theme = api as unknown as Window["theme"];

    await initializeTheme();
    await setThemePreference("light");

    expect(api.set).toHaveBeenCalledWith("light");
    expect(useThemeStore.getState()).toEqual({ preference: "light", resolvedDark: false });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("setThemePreference selecciona dark y lo refleja sin reiniciar", async () => {
    const { api } = mockThemeApi();
    api.get.mockResolvedValue({ preference: "system", resolvedDark: false });
    api.set.mockResolvedValue({ preference: "dark", resolvedDark: true });
    window.theme = api as unknown as Window["theme"];

    await initializeTheme();
    await setThemePreference("dark");

    expect(useThemeStore.getState()).toEqual({ preference: "dark", resolvedDark: true });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("un cambio de tema del sistema mientras preference=system actualiza resolvedDark en vivo", async () => {
    const { api, emitUpdate } = mockThemeApi();
    api.get.mockResolvedValue({ preference: "system", resolvedDark: false });
    window.theme = api as unknown as Window["theme"];

    await initializeTheme();
    emitUpdate(true);

    expect(useThemeStore.getState().resolvedDark).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("setThemePreference selecciona pastel: aplica data-theme y no la clase dark", async () => {
    const { api } = mockThemeApi();
    api.get.mockResolvedValue({ preference: "system", resolvedDark: false });
    api.set.mockResolvedValue({ preference: "pastel", resolvedDark: false });
    window.theme = api as unknown as Window["theme"];

    await initializeTheme();
    await setThemePreference("pastel");

    expect(useThemeStore.getState()).toEqual({ preference: "pastel", resolvedDark: false });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("pastel");
  });

  it("setThemePreference selecciona nord: aplica data-theme Y la clase dark (nord es oscura)", async () => {
    const { api } = mockThemeApi();
    api.get.mockResolvedValue({ preference: "system", resolvedDark: false });
    api.set.mockResolvedValue({ preference: "nord", resolvedDark: true });
    window.theme = api as unknown as Window["theme"];

    await initializeTheme();
    await setThemePreference("nord");

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("nord");
  });

  it("volver a light desde una paleta alternativa quita el atributo data-theme", async () => {
    const { api } = mockThemeApi();
    api.get.mockResolvedValue({ preference: "solarized", resolvedDark: false });
    api.set.mockResolvedValue({ preference: "light", resolvedDark: false });
    window.theme = api as unknown as Window["theme"];

    await initializeTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("solarized");

    await setThemePreference("light");

    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
  });
});
