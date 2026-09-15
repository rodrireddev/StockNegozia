const DEFAULT_API_URL = "http://localhost:38123";

/**
 * Nunca hardcodeamos una IP LAN acá — cambia según la red (ver docs/lan/LAN_TESTING.md). En
 * desarrollo se configura con `VITE_API_URL` (mismo mecanismo `import.meta.env` que ya usa Vite en
 * el resto del monorepo, no un sistema de config nuevo). Sin la variable, asume que el backend
 * corre en la misma máquina que este cliente.
 */
export function resolveApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  return configured || DEFAULT_API_URL;
}
