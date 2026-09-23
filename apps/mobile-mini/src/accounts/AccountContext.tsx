import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AccountMeDto } from "@stocknegozia/api-contracts";
import type { AccountLoginInput, AccountRegisterInput } from "@stocknegozia/validation";
import { getMe, login as loginRequest, register as registerRequest } from "./api/accounts.api";
import { NetworkError, AuthRequiredError } from "./api/errors";
import { secureSessionStore } from "./SecureSessionStore";

export type AccountStatus = "bootstrapping" | "unauthenticated" | "authenticated";

export interface AccountContextValue {
  status: AccountStatus;
  /** `null` mientras no hay sesión, o mientras `me` todavía no resolvió tras loguearse. */
  me: AccountMeDto | null;
  register: (input: AccountRegisterInput) => Promise<void>;
  login: (input: AccountLoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Para refrescar el saldo después de mirar un anuncio o completar una acción. */
  refetchMe: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

/**
 * Cuenta opcional (doc §3) — a diferencia de `apps/mobile` (pairing LAN obligatorio para poder
 * usar la app), acá no bloquea nada: `mobile-mini` funciona 100% sin esto. Este contexto solo
 * gobierna el acceso al módulo de beneficios/créditos, que si exige cuenta (el ledger vive en
 * `apps/cloud-backend`, no local).
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AccountStatus>("bootstrapping");
  const [me, setMe] = useState<AccountMeDto | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = await secureSessionStore.getAccessToken();
      if (cancelled) return;
      if (!token) {
        setStatus("unauthenticated");
        return;
      }

      try {
        const meDto = await getMe();
        if (cancelled) return;
        setMe(meDto);
        setStatus("authenticated");
      } catch (error) {
        if (cancelled) return;
        if (error instanceof AuthRequiredError) {
          setStatus("unauthenticated");
        } else {
          // Red caída en el arranque: no hay credential LAN que optimistamente confiar acá (a
          // diferencia de `apps/mobile`) — sin `me` no hay saldo que mostrar, así que se queda sin
          // sesión hasta que el próximo intento de login/registro (o una futura reapertura con
          // red) resuelva.
          setStatus("unauthenticated");
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(async (input: AccountRegisterInput) => {
    const result = await registerRequest(input);
    await secureSessionStore.setAccessToken(result.accessToken);
    const meDto = await getMe();
    setMe(meDto);
    setStatus("authenticated");
  }, []);

  const login = useCallback(async (input: AccountLoginInput) => {
    const result = await loginRequest(input);
    await secureSessionStore.setAccessToken(result.accessToken);
    const meDto = await getMe();
    setMe(meDto);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    await secureSessionStore.clearAccessToken();
    setMe(null);
    setStatus("unauthenticated");
  }, []);

  const refetchMe = useCallback(async () => {
    try {
      const meDto = await getMe();
      setMe(meDto);
    } catch (error) {
      if (error instanceof AuthRequiredError) {
        setMe(null);
        setStatus("unauthenticated");
      } else if (!(error instanceof NetworkError)) {
        throw error;
      }
    }
  }, []);

  const value = useMemo<AccountContextValue>(
    () => ({ status, me, register, login, signOut, refetchMe }),
    [status, me, register, login, signOut, refetchMe],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount debe usarse dentro de <AccountProvider>");
  return ctx;
}
