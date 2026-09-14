import { networkInterfaces } from "node:os";

/**
 * Mejor esfuerzo para resolver una IP de LAN alcanzable desde otro dispositivo en la misma red —
 * `localhost`/`127.0.0.1` no sirven desde un segundo dispositivo (ver docs/security/PAIRING.md
 * §Host/red). Esto NO es descubrimiento de red (mDNS, etc. — eso queda para otro milestone): solo
 * elige la primera interfaz IPv4 no interna. `override` (env `PAIRING_HOST`) permite forzar un
 * valor cuando la autodetección no elige la interfaz correcta (varias NICs, VPN, etc.).
 */
export function resolveLanHost(override?: string): string {
  if (override) return override;

  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) return entry.address;
    }
  }

  return "127.0.0.1";
}
