import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type ThemePreference = "system" | "light" | "dark";

export interface StoredPreferences {
  theme: ThemePreference;
}

const DEFAULT_PREFERENCES: StoredPreferences = { theme: "system" };

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * Persiste preferencias de usuario (por ahora, solo el tema) en un JSON plano en `userData` — sin
 * cifrar, a diferencia de `DeviceCredentialStore`, porque no es información sensible. Mismo
 * criterio de robustez que el resto de la app: un archivo ausente o corrupto nunca rompe el
 * arranque, solo hace que se use el default (`system`).
 */
export class PreferencesStore {
  private readonly filePath: string;

  constructor(userDataDir: string) {
    this.filePath = path.join(userDataDir, "preferences.json");
  }

  load(): StoredPreferences {
    if (!existsSync(this.filePath)) return DEFAULT_PREFERENCES;
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf-8")) as { theme?: unknown };
      return isThemePreference(parsed.theme) ? { theme: parsed.theme } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  }

  save(preferences: StoredPreferences): void {
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(preferences, null, 2));
  }
}
