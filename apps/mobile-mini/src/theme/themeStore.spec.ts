import AsyncStorage from "@react-native-async-storage/async-storage";
import { getThemeMode, loadThemeMode, persistThemeMode } from "./themeStore";

describe("themeStore", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("sin preferencia guardada, resuelve a 'system' por defecto", async () => {
    const mode = await loadThemeMode();
    expect(mode).toBe("system");
  });

  it("persistThemeMode guarda la preferencia y loadThemeMode la restaura", async () => {
    await persistThemeMode("dark");

    const restored = await loadThemeMode();
    expect(restored).toBe("dark");
  });

  it("getThemeMode expone síncronamente el último valor cargado/persistido", async () => {
    await persistThemeMode("light");
    expect(getThemeMode()).toBe("light");
  });

  it("un valor corrupto/desconocido en el storage cae a 'system', sin romper el arranque", async () => {
    await AsyncStorage.setItem("stocknegozia.themeMode", "not-a-real-mode");

    const mode = await loadThemeMode();
    expect(mode).toBe("system");
  });
});
