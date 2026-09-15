import * as SecureStore from "expo-secure-store";
import type { CredentialStore } from "./CredentialStore";

/**
 * `expo-secure-store` — Keystore/EncryptedSharedPreferences en Android (Keychain en iOS, no
 * usado en M15). Nunca `AsyncStorage`, que persiste en texto plano — ver
 * docs/mobile/MOBILE_CLIENT.md §Credential storage.
 */
const CREDENTIAL_KEY = "stocknegozia.deviceCredential";

export const secureCredentialStore: CredentialStore = {
  async getCredential() {
    try {
      return await SecureStore.getItemAsync(CREDENTIAL_KEY);
    } catch {
      // SecureStore puede fallar si el Keystore del dispositivo no está disponible — se trata
      // igual que "no hay credential guardada" (vuelve a pairing), nunca se propaga el error con
      // detalle que pudiera filtrar contexto del secreto.
      return null;
    }
  },

  async setCredential(credential) {
    await SecureStore.setItemAsync(CREDENTIAL_KEY, credential);
  },

  async clearCredential() {
    try {
      await SecureStore.deleteItemAsync(CREDENTIAL_KEY);
    } catch {
      // ver comentario de getCredential — limpiar es best-effort.
    }
  },
};
