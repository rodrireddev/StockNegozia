/**
 * Abstracción de almacenamiento de la device credential — ver docs/mobile/MOBILE_CLIENT.md
 * §Credential storage. Permite reemplazar la implementación (`SecureCredentialStore`, hoy la
 * única) sin tocar `AuthContext` ni el resto de la app.
 *
 * Invariante de seguridad: ninguna implementación debe loggear, imprimir, ni incluir la
 * credential en ningún error — ver docs/security/PAIRING.md §Principio de seguridad.
 */
export interface CredentialStore {
  getCredential(): Promise<string | null>;
  setCredential(credential: string): Promise<void>;
  clearCredential(): Promise<void>;
}
