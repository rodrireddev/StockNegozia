import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AccountAuthResult, AccountMeDto } from "@stocknegozia/api-contracts";
import type { AccountLoginInput, AccountRegisterInput } from "@stocknegozia/validation";
import { AuthRequiredError } from "@/lib/cloud-api-client";
import { getMe, login as loginRequest, register as registerRequest } from "./api/accounts.api";

export type AccountStatus = "bootstrapping" | "unauthenticated" | "authenticated";

export interface AccountContextValue {
  status: AccountStatus;
  /** `null` mientras no hay sesión, o mientras `me` todavía no resolvió tras loguearse. */
  me: AccountMeDto | null;
  register: (input: AccountRegisterInput) => Promise<void>;
  login: (input: AccountLoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Para refrescar el saldo/estado (ej. después de que mobile acredite un anuncio). */
  refetchMe: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | null>(null);

/**
 * Cuenta cloud en `apps/desktop` (doc ADS_CREDITS_GAMIFICATION.md §6) — mismo patrón que
 * `mobile-mini/src/accounts/AccountContext.tsx`, pero el JWT vive en Electron main
 * (`window.cloudAccount`, safeStorage) en vez de `expo-secure-store`, y `setToken`/`clearToken`
 * además sincronizan el proxy `apps/backend` para que `apps/mobile` vea el cambio. Sin cola
 * offline/backfill de gamification: a diferencia de `mobile-mini`, `apps/desktop` no trackea
 * quests locales en esta pasada (fuera de alcance).
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AccountStatus>("bootstrapping");
  const [me, setMe] = useState<AccountMeDto | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = await window.cloudAccount.getToken();
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
      } catch {
        if (cancelled) return;
        // 401 (AuthRequiredError) ya limpió el token en `cloud-api-client.ts`; un error de red no
        // tiene `me` que mostrar tampoco — en ambos casos, sin sesión hasta el próximo login.
        setStatus("unauthenticated");
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const applySession = useCallback(async (result: AccountAuthResult) => {
    await window.cloudAccount.setToken(result.accessToken, result.expiresAt);
    const meDto = await getMe();
    setMe(meDto);
    setStatus("authenticated");
  }, []);

  const register = useCallback(
    async (input: AccountRegisterInput) => applySession(await registerRequest(input)),
    [applySession],
  );

  const login = useCallback(
    async (input: AccountLoginInput) => applySession(await loginRequest(input)),
    [applySession],
  );

  const signOut = useCallback(async () => {
    await window.cloudAccount.clearToken();
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
      } else {
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
