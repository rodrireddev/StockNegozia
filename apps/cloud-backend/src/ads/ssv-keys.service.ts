import { Injectable, Logger } from "@nestjs/common";

export interface SsvKey {
  keyId: number;
  pem: string;
  base64: string;
}

interface SsvKeysResponse {
  keys: SsvKey[];
}

const KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";
/** Google: "should not be cached for longer than 24 hours" — 6hs deja margen real sin pegarle a
 *  este endpoint en cada callback (con tráfico real puede haber varios por minuto). */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** Claves públicas para verificar los callbacks de SSV de AdMob (rotan, ver comentario arriba). */
@Injectable()
export class SsvKeysService {
  private readonly logger = new Logger(SsvKeysService.name);
  private cache: { keys: SsvKey[]; fetchedAt: number } | null = null;

  async getKeys(): Promise<SsvKey[]> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.keys;
    }

    try {
      const response = await fetch(KEYS_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as SsvKeysResponse;
      this.cache = { keys: body.keys, fetchedAt: Date.now() };
      return body.keys;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`No se pudieron refrescar las claves de verificación de AdMob: ${reason}`);
      if (this.cache) return this.cache.keys; // mejor una clave vieja que ninguna
      throw new Error("No se pudieron obtener las claves de verificación de AdMob");
    }
  }
}
