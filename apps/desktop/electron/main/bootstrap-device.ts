import type { BootstrapResult } from "@stocknegozia/api-contracts";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { DeviceCredentialStore } from "./device-credential-store";

/**
 * Resuelve la identidad del dispositivo Electron frente al backend (ver
 * docs/security/API_ACCESS.md §Bootstrap):
 *
 * - Si ya hay una credential guardada, se reutiliza.
 * - Si no, busca el token de bootstrap de un solo uso que el backend escribe en
 *   `<dataDir>/config/bootstrap.token` (el mismo `dataDir` que Electron ya le inyecta al backend
 *   como `STOCKNEGOZIA_DATA_DIR`, así que no hace falta ningún canal nuevo para leerlo) y lo
 *   canjea por una credential propia en `POST /auth/bootstrap`.
 * - Si no existe el archivo (por ejemplo, `API_ACCESS_MODE=development`, o ya existe otro
 *   dispositivo activo y este todavía no tiene credential), no hay nada que hacer todavía.
 */
export async function ensureDeviceCredential(
  baseUrl: string,
  dataDir: string,
  store: DeviceCredentialStore,
): Promise<BootstrapResult | null> {
  const existing = store.load();
  if (existing) return existing;

  const tokenPath = path.join(dataDir, "config", "bootstrap.token");
  if (!existsSync(tokenPath)) return null;

  const token = readFileSync(tokenPath, "utf-8").trim();
  const response = await fetch(`${baseUrl}/auth/bootstrap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, name: "Electron Desktop", type: "desktop" }),
  });
  if (!response.ok) return null;

  const result = (await response.json()) as BootstrapResult;
  store.save(result);
  return result;
}
