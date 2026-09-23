import { useCallback, useEffect, useRef, useState } from "react";
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  type RewardedAdReward,
} from "react-native-google-mobile-ads";

/**
 * `TestIds.REWARDED` de la propia librería (no un string hardcodeado acá) — resuelve al ad unit de
 * prueba oficial de Google según la plataforma (Android/iOS), siempre devuelve un anuncio de
 * prueba sin importar la cuenta de AdMob real. Reemplazar por el ad unit real (vía
 * `apps/cloud-backend`, tabla `ad_placements`, todavía sin exponer a este cliente) es el único
 * cambio necesario para pasar a producción — ver doc ADS_CREDITS_GAMIFICATION.md §1bis.
 */
export const REWARDED_AD_UNIT_ID = TestIds.REWARDED;

export type RewardedAdStatus = "idle" | "loading" | "loaded" | "showing" | "error";

export interface UseRewardedAdResult {
  status: RewardedAdStatus;
  /** Créditos "ganados" en la última vista completa — `null` hasta la primera recompensa. */
  lastReward: RewardedAdReward | null;
  error: string | null;
  /** Pide un anuncio nuevo al ad network — llamarlo apenas se muestra la pantalla que ofrece el reward. */
  load: () => void;
  /** Solo funciona si `status === "loaded"`. */
  show: () => void;
}

/**
 * Wrapper fino sobre `RewardedAd` de `react-native-google-mobile-ads` — cliente de prueba/prototipo
 * (doc "Próximos pasos": "Prototipo de integración AdMob rewarded en mobile-mini"). Todavía NO
 * está conectado al backend de créditos (`POST /gamification/...` no existe para esto): otorgar el
 * crédito real al confirmar el reward, con verificación server-side (SSV, ver
 * `ad_reward_callbacks` en el schema), es el paso siguiente antes de producción.
 */
export function useRewardedAd(adUnitId: string = REWARDED_AD_UNIT_ID): UseRewardedAdResult {
  const [status, setStatus] = useState<RewardedAdStatus>("idle");
  const [lastReward, setLastReward] = useState<RewardedAdReward | null>(null);
  const [error, setError] = useState<string | null>(null);
  const adRef = useRef<RewardedAd | null>(null);

  useEffect(() => {
    const ad = RewardedAd.createForAdRequest(adUnitId);
    adRef.current = ad;

    const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setStatus("loaded");
    });
    const unsubscribeEarned = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward: RewardedAdReward) => {
        setLastReward(reward);
      },
    );
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
  }, [adUnitId]);

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

  return { status, lastReward, error, load, show };
}
