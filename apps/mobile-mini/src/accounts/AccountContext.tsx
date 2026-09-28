import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import type { AccountAuthResult, AccountMeDto } from "@stocknegozia/api-contracts";
import type { AccountLoginInput, AccountRegisterInput, PasswordResetConfirmInput } from "@stocknegozia/validation";
import { backfillSetupQuestsFromLocalData } from "@/features/benefits/gamificationTriggers";
import { drainGamificationOutbox } from "@/features/benefits/outboxSyncRunner";
import {
  confirmPasswordReset as confirmPasswordResetRequest,
  deleteAccount as deleteAccountRequest,
  getMe,
  login as loginRequest,
  register as registerRequest,
} from "./api/accounts.api";
import { NetworkError, AuthRequiredError } from "./api/errors";
import { secureSessionStore } from "./SecureSessionStore";

export type AccountStatus = "bootstrapping" | "unauthenticated" | "authenticated";

export interface AccountContextValue {
  status: AccountStatus;
  /** `null` mientras no hay sesión, o mientras `me` todavía no resolvió tras loguearse. */
  me: AccountMeDto | null;
  register: (input: AccountRegisterInput) => Promise<void>;
  login: (input: AccountLoginInput) => Promise<void>;
  /** Reset de contraseña confirmado — el backend ya emitió una sesión nueva, solo hay que aplicarla. */
  completePasswordReset: (input: PasswordResetConfirmInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** Borrado de cuenta (política de Google Play) — irreversible, pide la contraseña de nuevo. */
  deleteAccount: (password: string) => Promise<void>;
  /** Para refrescar el saldo/estado (después de un anuncio, o de confirmar el email). */
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
        // Drena lo que haya quedado pendiente de una sesión anterior sin red (doc de logros: "al
        // conectarse, actualiza el estado de anterior al actual") — fire-and-forget, nunca bloquea
        // el arranque.
        void drainGamificationOutbox();
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

  const applySession = useCallback(async (result: AccountAuthResult) => {
    await secureSessionStore.setAccessToken(result.accessToken);
    const meDto = await getMe();
    setMe(meDto);
    setStatus("authenticated");
    // Fire-and-forget — repara el caso de un comercio que ya tenía productos/ventas locales
    // antes de esta sesión (doc §3, "caso: usuario existente se registra"). Nunca bloquea el login.
    void backfillSetupQuestsFromLocalData();
    void drainGamificationOutbox();
  }, []);

  const register = useCallback(
    async (input: AccountRegisterInput) => applySession(await registerRequest(input)),
    [applySession],
  );

  const login = useCallback(
    async (input: AccountLoginInput) => applySession(await loginRequest(input)),
    [applySession],
  );

  const completePasswordReset = useCallback(
    async (input: PasswordResetConfirmInput) => applySession(await confirmPasswordResetRequest(input)),
    [applySession],
  );

  const signOut = useCallback(async () => {
    await secureSessionStore.clearAccessToken();
    setMe(null);
    setStatus("unauthenticated");
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    await deleteAccountRequest({ password });
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

  // Drena el outbox al volver a foreground y al reconectar red — mientras la app está en
  // background/offline, todo lo que pase (venta, ajuste de stock, etc.) se sigue encolando local
  // (`gamificationTriggers.ts`) sin problema; esto es lo que lo saca de la cola apenas hay chance.
  useEffect(() => {
    if (status !== "authenticated") return;

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void drainGamificationOutbox();
    });
    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) void drainGamificationOutbox();
    });

    return () => {
      appStateSubscription.remove();
      netInfoUnsubscribe();
    };
  }, [status]);

  const value = useMemo<AccountContextValue>(
    () => ({ status, me, register, login, completePasswordReset, signOut, deleteAccount, refetchMe }),
    [status, me, register, login, completePasswordReset, signOut, deleteAccount, refetchMe],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount debe usarse dentro de <AccountProvider>");
  return ctx;
}
