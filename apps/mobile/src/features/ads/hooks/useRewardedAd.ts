import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import type { RewardedAd } from "react-native-google-mobile-ads";
import type { RewardedAdClaimResult, RewardedAdStatusDto } from "@stocknegozia/api-contracts";
import { useCloudAccountStatus } from "@/devices/useCloudAccountStatus";
import {
  claimRewardedAd,
  getAdPlacement,
  getRewardedAdStatus,
} from "@/features/benefits/api/cloudAccount.api";
import { useCloudAccountMe } from "@/features/benefits/hooks/useCloudAccountMe";
import { getNativeAdsModule } from "../nativeAdsModule";

const REWARDED_AD_PLACEMENT_KEY = "rewarded_credits";

/**
 * Mismo valor que expone `TestIds.REWARDED` del SDK para Android — hardcodeado en vez de
 * importado porque el paquete no se puede importar de forma estática (ver `nativeAdsModule.ts`).
 * Fallback si `apps/cloud-backend` no tiene un placement habilitado para esta plataforma, o si la
 * request falla (sin red, desktop no logueado todavía). Nunca deja al usuario sin poder ver un
 * anuncio solo porque el proxy esté caído.
 */
export const REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/5224354917";

/** `unavailable` = corriendo en Expo Go u otro entorno sin el módulo nativo (ver `nativeAdsModule.ts`). */
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

/**
 * Mismo patrón que `mobile-mini/src/features/ads/hooks/useRewardedAd.ts`, pero acá el JWT de
 * cuenta cloud nunca llega a este dispositivo: todo pasa por el proxy `apps/backend`
 * (`cloudAccount.api.ts`) — ver docs/monetization/ADS_CREDITS_GAMIFICATION.md §6.
 */
export function useRewardedAd(): UseRewardedAdResult {
  const nativeAds = getNativeAdsModule();
  const { data: cloudStatus } = useCloudAccountStatus();
  const meQuery = useCloudAccountMe();
  const linked = cloudStatus?.linked === true;
  const [status, setStatus] = useState<RewardedAdStatus>(nativeAds ? "idle" : "unavailable");
  const [lastClaim, setLastClaim] = useState<RewardedAdClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adUnitId, setAdUnitId] = useState<string>(REWARDED_AD_UNIT_ID);
  const [eligibility, setEligibility] = useState<RewardedAdStatusDto | null>(null);
  const [secondsUntilEligible, setSecondsUntilEligible] = useState<number | null>(null);
  const adRef = useRef<RewardedAd | null>(null);
  const pendingShowRef = useRef(false);

  const refetchEligibility = useCallback(() => {
    if (!linked) return;
    getRewardedAdStatus()
      .then(setEligibility)
      // Sin red o desktop desemparejado — no bloqueamos el botón por esto, el backend igual valida
      // en el claim real; solo perdemos la cuenta regresiva anticipada.
      .catch(() => {});
  }, [linked]);

  // Pide el ad unit real al proxy (tabla `ad_placements`) apenas hay cuenta linkeada — si no
  // responde o el placement está deshabilitado (kill switch), se queda con el fallback de prueba.
  useEffect(() => {
    if (!linked) return;
    const platform = Platform.OS === "ios" ? "ios" : "android";
    getAdPlacement(REWARDED_AD_PLACEMENT_KEY, platform)
      .then((placement) => {
        if (placement) setAdUnitId(placement.adUnitId);
      })
      .catch(() => {
        // sin red o desktop desemparejado — se sigue usando el fallback de prueba.
      });
  }, [linked]);

  useEffect(refetchEligibility, [refetchEligibility]);

  // Cuenta regresiva local mientras haya un `nextEligibleAt` en el futuro.
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

    // `userId` (doc ADS_CREDITS_GAMIFICATION.md, SSV) sale del `id` que devuelve el proxy
    // (`/cloud-account/me`) — Google lo devuelve firmado en el callback de SSV.
    const ad = nativeAds.RewardedAd.createForAdRequest(adUnitId, {
      serverSideVerificationOptions: meQuery.data ? { userId: meQuery.data.id } : undefined,
    });
    adRef.current = ad;

    const unsubscribeLoaded = ad.addAdEventListener(nativeAds.RewardedAdEventType.LOADED, () => {
      if (!pendingShowRef.current) return;
      pendingShowRef.current = false;
      setStatus("showing");
      ad.show();
    });
    const unsubscribeEarned = ad.addAdEventListener(
      nativeAds.RewardedAdEventType.EARNED_REWARD,
      () => {
        if (!linked) return;
        claimRewardedAd()
          .then((result) => {
            setLastClaim(result);
            if (result.granted) void meQuery.refetch();
            refetchEligibility();
          })
          .catch((err) => setError(err instanceof Error ? err.message : "No se pudo acreditar"));
      },
    );
    const unsubscribeClosed = ad.addAdEventListener(nativeAds.AdEventType.CLOSED, () => {
      setStatus("idle");
    });
    const unsubscribeError = ad.addAdEventListener(
      nativeAds.AdEventType.ERROR,
      (adError: Error) => {
        pendingShowRef.current = false;
        setStatus("error");
        setError(adError.message);
      },
    );

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [nativeAds, adUnitId, linked, meQuery, refetchEligibility]);

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
