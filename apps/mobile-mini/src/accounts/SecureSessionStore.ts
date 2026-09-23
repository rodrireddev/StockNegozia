import * as SecureStore from "expo-secure-store";

/**
 * `expo-secure-store` (Keystore/EncryptedSharedPreferences en Android) — nunca `AsyncStorage`,
 * que persiste en texto plano. Mismo criterio que `apps/mobile/src/auth/SecureCredentialStore.ts`,
 * pero acá guarda el JWT de cuenta (doc §3) en vez de una credential de dispositivo LAN.
 */
const ACCESS_TOKEN_KEY = "stocknegozia.accountAccessToken";

export const secureSessionStore = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      // SecureStore puede fallar si el Keystore del dispositivo no está disponible — se trata
      // igual que "no hay sesión guardada" (vuelve a login), nunca se propaga el error.
      return null;
    }
  },

  async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },

  async clearAccessToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      // ver comentario de getAccessToken — limpiar es best-effort.
    }
  },
};
