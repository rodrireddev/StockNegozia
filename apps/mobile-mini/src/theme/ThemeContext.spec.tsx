import * as ReactNative from "react-native";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider, useThemeMode } from "./ThemeContext";
import { useTheme } from "./useTheme";

// `jest.spyOn` sobre el export real (en vez de `jest.mock("react-native", factory)`, que
// reevalúa el módulo entero y dispara errores de módulos nativos no registrados en el entorno de
// test) — mismo objeto que `ThemeContext.tsx`/`useTheme.ts` importan.
const mockUseColorScheme = jest.spyOn(ReactNative, "useColorScheme");

describe("ThemeProvider / useThemeMode", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockUseColorScheme.mockReset();
    mockUseColorScheme.mockReturnValue("light");
  });

  it("sin preferencia guardada, arranca en 'system' y sigue el esquema del sistema operativo", async () => {
    mockUseColorScheme.mockReturnValue("dark");

    const { result } = await renderHook(() => useThemeMode(), { wrapper: ThemeProvider });

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.mode).toBe("system");
    expect(result.current.dark).toBe(true);
  });

  it("setMode('dark') fuerza oscuro sin importar el esquema del sistema", async () => {
    mockUseColorScheme.mockReturnValue("light");
    const { result } = await renderHook(() => useThemeMode(), { wrapper: ThemeProvider });
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.setMode("dark");
    });

    expect(result.current.mode).toBe("dark");
    expect(result.current.dark).toBe(true);
  });

  it("setMode('light') fuerza claro sin importar el esquema del sistema", async () => {
    mockUseColorScheme.mockReturnValue("dark");
    const { result } = await renderHook(() => useThemeMode(), { wrapper: ThemeProvider });
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.setMode("light");
    });

    expect(result.current.mode).toBe("light");
    expect(result.current.dark).toBe(false);
  });

  it("la preferencia persiste entre 'reinicios' de la app (remount de ThemeProvider)", async () => {
    const first = await renderHook(() => useThemeMode(), { wrapper: ThemeProvider });
    await waitFor(() => expect(first.result.current.ready).toBe(true));

    await act(async () => {
      await first.result.current.setMode("dark");
    });
    expect(first.result.current.mode).toBe("dark");
    await first.unmount();

    // Simula "cerrar y reabrir la app": un ThemeProvider nuevo, mismo AsyncStorage subyacente.
    const second = await renderHook(() => useThemeMode(), { wrapper: ThemeProvider });

    await waitFor(() => expect(second.result.current.mode).toBe("dark"));
    expect(second.result.current.dark).toBe(true);
  });

  it("volver a 'system' después de un modo manual vuelve a seguir el sistema operativo", async () => {
    mockUseColorScheme.mockReturnValue("dark");
    const { result } = await renderHook(() => useThemeMode(), { wrapper: ThemeProvider });
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.setMode("light");
    });
    expect(result.current.dark).toBe(false);

    await act(async () => {
      await result.current.setMode("system");
    });

    expect(result.current.mode).toBe("system");
    expect(result.current.dark).toBe(true); // sistema simulado en "dark"
  });

  it("useThemeMode() lanza si se usa fuera de <ThemeProvider>", async () => {
    // Silencia el log de error esperado que React imprime al fallar el render.
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    await expect(renderHook(() => useThemeMode())).rejects.toThrow(
      /useThemeMode debe usarse dentro de <ThemeProvider>/,
    );
    spy.mockRestore();
  });
});

describe("useTheme() — compatibilidad sin ThemeProvider", () => {
  beforeEach(() => {
    mockUseColorScheme.mockReset();
  });

  it("sin ThemeProvider montado, cae al esquema del sistema operativo (comportamiento previo a M15)", async () => {
    mockUseColorScheme.mockReturnValue("dark");

    const { result } = await renderHook(() => useTheme());

    expect(result.current.dark).toBe(true);
  });

  it("sin ThemeProvider montado y sistema en claro, resuelve a claro", async () => {
    mockUseColorScheme.mockReturnValue("light");

    const { result } = await renderHook(() => useTheme());

    expect(result.current.dark).toBe(false);
  });
});
