import { useEffect } from "react";
import { AuthRequiredError } from "@/api/errors";
import { useAuth } from "./AuthContext";

/**
 * Cualquier `AuthRequiredError` (401 — credential ausente/inválida/revocada, ver
 * docs/security/API_ACCESS.md) ya limpió la credential en `src/api/client.ts`; acá solo falta
 * avisarle a `AuthContext` para que la navegación reaccione y vuelva a `/pairing` — ver
 * docs/mobile/MOBILE_CLIENT.md §401 / revocación.
 */
export function useAuthErrorRedirect(error: unknown): void {
  const { signOut } = useAuth();

  useEffect(() => {
    if (error instanceof AuthRequiredError) {
      signOut();
    }
  }, [error, signOut]);
}
