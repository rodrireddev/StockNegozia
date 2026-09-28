import { safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface StoredCloudAccountCredential {
  accessToken: string;
  expiresAt: string;
}

/**
 * Persiste el JWT de cuenta cloud (`apps/cloud-backend`, doc ADS_CREDITS_GAMIFICATION.md §6)
 * cifrado con `safeStorage` — mismo criterio que `DeviceCredentialStore`, pero acá guarda la
 * sesión de cuenta cloud (login desktop) en vez de la credential del dispositivo LAN; son dos
 * secretos completamente distintos, cada uno en su propio archivo. Nunca llega al proceso
 * renderer en texto plano — se expone solo vía el bridge `cloudAccount` del preload.
 */
export class CloudAccountCredentialStore {
  private readonly filePath: string;

  constructor(userDataDir: string) {
    this.filePath = path.join(userDataDir, "cloud-account-credential.enc");
  }

  load(): StoredCloudAccountCredential | null {
    if (!existsSync(this.filePath) || !safeStorage.isEncryptionAvailable()) return null;
    try {
      const decrypted = safeStorage.decryptString(readFileSync(this.filePath));
      return JSON.parse(decrypted) as StoredCloudAccountCredential;
    } catch {
      return null;
    }
  }

  save(value: StoredCloudAccountCredential): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("El almacenamiento seguro del sistema operativo no está disponible");
    }
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, safeStorage.encryptString(JSON.stringify(value)));
  }

  clear(): void {
    if (existsSync(this.filePath)) rmSync(this.filePath);
  }
}
