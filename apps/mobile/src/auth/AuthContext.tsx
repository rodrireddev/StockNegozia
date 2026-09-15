import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { confirmPairing, getMe, type ConfirmPairingInput } from "@/api/endpoints/auth";
import { AuthRequiredError } from "@/api/errors";
import {
  getBackendUrl,
  loadBackendUrl,
  setBackendUrl as persistBackendUrl,
} from "@/config/backendUrlStore";
import { secureCredentialStore } from "@/auth/SecureCredentialStore";

export type AuthStatus = "bootstrapping" | "unauthenticated" | "authenticated";

export interface AuthContextValue {
  status: AuthStatus;
  backendUrl: string | null;
  configureBackendUrl: (url: string) => Promise<void>;
  pair: (input: ConfirmPairingInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("bootstrapping");
  const [backendUrl, setBackendUrlState] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const url = await loadBackendUrl();
      if (cancelled) return;
      setBackendUrlState(url);

      const credential = await secureCredentialStore.getCredential();
      if (cancelled) return;

      if (!credential) {
        setStatus("unauthenticated");
        return;
      }

      // Verificamos contra el backend cuando hay conexión — un dispositivo revocado no debería
      // ver la pantalla de Products ni por un instante (ver docs/security/PAIRING.md §Estado
      // `cancelled`/revocación). Si el backend no es alcanzable, quedamos autenticados de forma
      // optimista: `useProducts`/`useDeviceInfo` van a reintentar la verificación real más tarde,
      // y cualquier 401 futuro limpia la sesión igual (ver `src/api/client.ts`).
      try {
        await getMe();
        if (cancelled) return;
        setStatus("authenticated");
      } catch (error) {
        if (cancelled) return;
        if (error instanceof AuthRequiredError) {
          setStatus("unauthenticated");
        } else {
          setStatus("authenticated");
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const configureBackendUrl = useCallback(async (url: string) => {
    await persistBackendUrl(url);
    setBackendUrlState(getBackendUrl());
  }, []);

  const pair = useCallback(async (input: ConfirmPairingInput) => {
    const result = await confirmPairing(input);
    await secureCredentialStore.setCredential(result.credential);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    await secureCredentialStore.clearCredential();
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, backendUrl, configureBackendUrl, pair, signOut }),
    [status, backendUrl, configureBackendUrl, pair, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
