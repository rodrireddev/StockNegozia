import { safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface StoredDeviceCredential {
  deviceId: string;
  credential: string;
}

/**
 * Persiste la credential del dispositivo cifrada con `safeStorage` (DPAPI en Windows, Keychain en
 * macOS, libsecret en Linux) — no agrega ninguna dependencia nueva, viene incluido en Electron.
 * El archivo cifrado vive en el mismo `userData` que el resto de los datos de la app; nunca en
 * texto plano, y nunca llega al proceso renderer (ver docs/security/API_ACCESS.md §Electron).
 */
export class DeviceCredentialStore {
  private readonly filePath: string;

  constructor(userDataDir: string) {
    this.filePath = path.join(userDataDir, "device-credential.enc");
  }

  load(): StoredDeviceCredential | null {
    if (!existsSync(this.filePath) || !safeStorage.isEncryptionAvailable()) return null;
    try {
      const decrypted = safeStorage.decryptString(readFileSync(this.filePath));
      return JSON.parse(decrypted) as StoredDeviceCredential;
    } catch {
      return null;
    }
  }

  save(value: StoredDeviceCredential): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("El almacenamiento seguro del sistema operativo no está disponible");
    }
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, safeStorage.encryptString(JSON.stringify(value)));
  }
}
