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
});
