import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from "react-native-google-mobile-ads";
import type { RewardedAdClaimResult } from "@stocknegozia/api-contracts";
import { useAccount } from "@/accounts/AccountContext";
import { getAdPlacement } from "@/accounts/api/ads.api";
import { claimRewardedAd } from "@/accounts/api/gamification.api";

const REWARDED_AD_PLACEMENT_KEY = "rewarded_credits";

/**
 * `TestIds.REWARDED` de la propia librería — fallback si `apps/cloud-backend` no tiene un
 * placement habilitado para esta plataforma, o si la request falla (sin red, sin cuenta todavía).
 * Nunca deja al usuario sin poder ver un anuncio solo porque el backend esté caído.
 */
export const REWARDED_AD_UNIT_ID = TestIds.REWARDED;

export type RewardedAdStatus = "idle" | "loading" | "loaded" | "showing" | "error";

export interface UseRewardedAdResult {
  status: RewardedAdStatus;
  /** Resultado real del backend tras la última vista completa — `null` hasta la primera. */
  lastClaim: RewardedAdClaimResult | null;
  error: string | null;
  /** Pide un anuncio nuevo al ad network — llamarlo apenas se muestra la pantalla que ofrece el reward. */
  load: () => void;
  /** Solo funciona si `status === "loaded"`. */
  show: () => void;
}

/**
 * Wrapper sobre `RewardedAd` de `react-native-google-mobile-ads` + el claim real contra
 * `apps/cloud-backend` (`POST /gamification/rewarded-ad/claim`). El `reward` que reporta el SDK de
 * AdMob (`RewardedAdEventType.EARNED_REWARD`) es solo la señal de "terminó de verlo" — el monto
 * real en créditos lo decide el backend (`credit_config_items`), nunca el valor que devuelve
 * AdMob (que en el ad unit de prueba es un número fijo sin relación con nuestra economía). ⚠️ El
 * claim en sí todavía confía en el cliente, sin SSV — ver el comentario en
 * `RewardedAdsService` del backend.
 */
export function useRewardedAd(): UseRewardedAdResult {
  const { status: accountStatus, me, refetchMe } = useAccount();
  const [status, setStatus] = useState<RewardedAdStatus>("idle");
  const [lastClaim, setLastClaim] = useState<RewardedAdClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adUnitId, setAdUnitId] = useState<string>(REWARDED_AD_UNIT_ID);
  const adRef = useRef<RewardedAd | null>(null);

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

  useEffect(() => {
    // `userId` (doc ADS_CREDITS_GAMIFICATION.md, SSV) — Google lo devuelve firmado en el callback
    // de SSV, así el backend sabe a quién acreditar sin confiar en lo que diga el cliente. Sin
    // efecto todavía: el ad unit de prueba no tiene SSV configurado (ver `AdRewardCallbackService`
    // del backend), pero queda listo para el día que haya una cuenta de AdMob real.
    const ad = RewardedAd.createForAdRequest(adUnitId, {
      serverSideVerificationOptions: me ? { userId: me.id } : undefined,
    });
    adRef.current = ad;

    const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setStatus("loaded");
    });
    const unsubscribeEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      // El SDK ya confirmó que se vio completo — recién ahí tiene sentido pedirle al backend que
      // acredite. Sin cuenta no hay nada que acreditar (el módulo entero vive detrás de login).
      if (accountStatus !== "authenticated") return;
      claimRewardedAd()
        .then((result) => {
          setLastClaim(result);
          if (result.granted) void refetchMe();
        })
        .catch((err) => setError(err instanceof Error ? err.message : "No se pudo acreditar"));
    });
    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      // Se cerró el anuncio (con o sin reward) — hay que pedir uno nuevo para la próxima vez, un
      // `RewardedAd` de esta librería se consume una sola vez.
      setStatus("idle");
    });
    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (adError: Error) => {
      setStatus("error");
      setError(adError.message);
    });

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [adUnitId, accountStatus, me, refetchMe]);

  const load = useCallback(() => {
    setError(null);
    setStatus("loading");
    adRef.current?.load();
  }, []);

  const show = useCallback(() => {
    if (status !== "loaded") return;
    setStatus("showing");
    adRef.current?.show();
  }, [status]);

  return { status, lastClaim, error, load, show };
}
