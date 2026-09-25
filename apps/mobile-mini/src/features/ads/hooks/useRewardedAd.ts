import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import type { RewardedAd } from "react-native-google-mobile-ads";
import type { RewardedAdClaimResult, RewardedAdStatusDto } from "@stocknegozia/api-contracts";
import { useAccount } from "@/accounts/AccountContext";
import { getAdPlacement } from "@/accounts/api/ads.api";
import { claimRewardedAd, getRewardedAdStatus } from "@/accounts/api/gamification.api";
import { getNativeAdsModule } from "../nativeAdsModule";

const REWARDED_AD_PLACEMENT_KEY = "rewarded_credits";

/**
 * Mismo valor que expone `TestIds.REWARDED` del SDK para Android — hardcodeado en vez de
 * importado porque el paquete no se puede importar de forma estática (ver `nativeAdsModule.ts`).
 * Fallback si `apps/cloud-backend` no tiene un placement habilitado para esta plataforma, o si la
 * request falla (sin red, sin cuenta todavía). Nunca deja al usuario sin poder ver un anuncio solo
 * porque el backend esté caído.
 */
export const REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/5224354917";

/**
 * `unavailable` = corriendo en Expo Go u otro entorno sin el módulo nativo (ver `nativeAdsModule.ts`).
 * Ya no existe un estado público "loaded": apenas el SDK confirma que el anuncio cargó, se muestra
 * solo — un único botón "Ver anuncio" en vez de "Cargar" + "Mostrar" por separado.
 */
export type RewardedAdStatus = "unavailable" | "idle" | "loading" | "showing" | "error";

export interface UseRewardedAdResult {
  status: RewardedAdStatus;
  /** Resultado real del backend tras la última vista completa — `null` hasta la primera. */
  lastClaim: RewardedAdClaimResult | null;
  error: string | null;
  /** `false` mientras está en cooldown o ya llegó al tope del día — el botón debe deshabilitarse. */
  eligible: boolean;
  /** Motivo de `eligible: false` — `null` si es elegible o todavía no se supo (primer render). */
  ineligibleReason: string | null;
  /** Cuenta regresiva en segundos hasta que termine el cooldown — `null` si no aplica. */
  secondsUntilEligible: number | null;
  /** Carga el anuncio y lo muestra apenas esté listo — un solo botón, un solo paso. */
  watch: () => void;
}

export function useRewardedAd(): UseRewardedAdResult {
  const nativeAds = getNativeAdsModule();
  const { status: accountStatus, me, refetchMe } = useAccount();
  const [status, setStatus] = useState<RewardedAdStatus>(nativeAds ? "idle" : "unavailable");
  const [lastClaim, setLastClaim] = useState<RewardedAdClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adUnitId, setAdUnitId] = useState<string>(REWARDED_AD_UNIT_ID);
  const [eligibility, setEligibility] = useState<RewardedAdStatusDto | null>(null);
  const [secondsUntilEligible, setSecondsUntilEligible] = useState<number | null>(null);
  const adRef = useRef<RewardedAd | null>(null);
  const pendingShowRef = useRef(false);

  const refetchEligibility = useCallback(() => {
    if (accountStatus !== "authenticated") return;
    getRewardedAdStatus()
      .then(setEligibility)
      // Sin red o sesión vencida — no bloqueamos el botón por esto, el backend igual valida en el
      // claim real; solo perdemos la cuenta regresiva anticipada.
      .catch(() => {});
  }, [accountStatus]);

  // Pide el ad unit real al backend (tabla `ad_placements`) apenas hay cuenta — si no responde o
  // el placement está deshabilitado (kill switch), se queda con `REWARDED_AD_UNIT_ID` de prueba.
  useEffect(() => {
    if (accountStatus !== "authenticated") return;
    const platform = Platform.OS === "ios" ? "ios" : "android";
    getAdPlacement(REWARDED_AD_PLACEMENT_KEY, platform)
      .then((placement) => {
        if (placement) setAdUnitId(placement.adUnitId);
      })
      .catch(() => {
        // sin red o sesión vencida — se sigue usando el fallback de prueba.
      });
  }, [accountStatus]);

  useEffect(refetchEligibility, [refetchEligibility]);

  // Cuenta regresiva local mientras haya un `nextEligibleAt` en el futuro — al llegar a 0 vuelve a
  // preguntarle al backend (evita quedarse desincronizado si un admin cambió el cooldown mientras
  // tanto).
  useEffect(() => {
    if (eligibility?.reason !== "cooldown" || !eligibility.nextEligibleAt) {
      setSecondsUntilEligible(null);
      return;
    }

    const nextEligibleAt = new Date(eligibility.nextEligibleAt).getTime();
    const tick = () => {
      const remaining = Math.ceil((nextEligibleAt - Date.now()) / 1000);
      if (remaining <= 0) {
        setSecondsUntilEligible(null);
        refetchEligibility();
        return false;
      }
      setSecondsUntilEligible(remaining);
      return true;
    };

    if (!tick()) return;
    const interval = setInterval(() => {
      if (!tick()) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [eligibility, refetchEligibility]);

  useEffect(() => {
    if (!nativeAds) return; // Expo Go — no hay módulo nativo con el que crear un RewardedAd.

    // `userId` (doc ADS_CREDITS_GAMIFICATION.md, SSV) — Google lo devuelve firmado en el callback
    // de SSV, así el backend sabe a quién acreditar sin confiar en lo que diga el cliente. Sin
    // efecto todavía: el ad unit de prueba no tiene SSV configurado (ver `AdRewardCallbackService`
    // del backend), pero queda listo para el día que haya una cuenta de AdMob real.
    const ad = nativeAds.RewardedAd.createForAdRequest(adUnitId, {
      serverSideVerificationOptions: me ? { userId: me.id } : undefined,
    });
    adRef.current = ad;

    const unsubscribeLoaded = ad.addAdEventListener(nativeAds.RewardedAdEventType.LOADED, () => {
      // Un solo botón "Ver anuncio": apenas el SDK confirma que cargó, se muestra directo — el
      // usuario nunca ve un estado intermedio de "listo, ahora tocá para verlo".
      if (!pendingShowRef.current) return;
      pendingShowRef.current = false;
      setStatus("showing");
      ad.show();
    });
    const unsubscribeEarned = ad.addAdEventListener(nativeAds.RewardedAdEventType.EARNED_REWARD, () => {
      // El SDK ya confirmó que se vio completo — recién ahí tiene sentido pedirle al backend que
      // acredite. Sin cuenta no hay nada que acreditar (el módulo entero vive detrás de login).
      if (accountStatus !== "authenticated") return;
      claimRewardedAd()
        .then((result) => {
          setLastClaim(result);
          if (result.granted) void refetchMe();
          refetchEligibility();
        })
        .catch((err) => setError(err instanceof Error ? err.message : "No se pudo acreditar"));
    });
    const unsubscribeClosed = ad.addAdEventListener(nativeAds.AdEventType.CLOSED, () => {
      // Se cerró el anuncio (con o sin reward) — hay que pedir uno nuevo para la próxima vez, un
      // `RewardedAd` de esta librería se consume una sola vez.
      setStatus("idle");
    });
    const unsubscribeError = ad.addAdEventListener(nativeAds.AdEventType.ERROR, (adError: Error) => {
      pendingShowRef.current = false;
      setStatus("error");
      setError(adError.message);
    });

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [nativeAds, adUnitId, accountStatus, me, refetchMe, refetchEligibility]);

  const watch = useCallback(() => {
    if (!nativeAds || status === "loading" || status === "showing") return;
    if (eligibility && !eligibility.eligible) return; // botón ya debería estar deshabilitado
    setError(null);
    setStatus("loading");
    pendingShowRef.current = true;
    adRef.current?.load();
  }, [nativeAds, status, eligibility]);

  return {
    status,
    lastClaim,
    error,
    eligible: eligibility?.eligible ?? true,
    ineligibleReason: eligibility?.eligible === false ? (eligibility.reason ?? null) : null,
    secondsUntilEligible,
    watch,
  };
}
