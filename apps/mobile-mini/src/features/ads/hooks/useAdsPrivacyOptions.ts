import { useEffect, useState } from "react";
import { getNativeAdsModule } from "../nativeAdsModule";

export interface UseAdsPrivacyOptionsResult {
  /** Solo `true` para usuarios donde el UMP de Google exige poder revisar el consentimiento
   *  después (ej. EEA/UK) — evita mostrar un botón sin sentido al resto. También `false` en
   *  Expo Go, donde no hay módulo nativo con el que mostrar nada (ver `nativeAdsModule.ts`). */
  visible: boolean;
  open: () => void;
}

/**
 * "Opciones de privacidad de anuncios" — Google exige que además del formulario de consentimiento
 * inicial (ver `_layout.tsx`, `AdsConsent.gatherConsent()`), el usuario pueda volver a abrirlo
 * después para cambiar de opinión. `showPrivacyOptionsForm()` es la API del propio SDK para eso.
 */
export function useAdsPrivacyOptions(): UseAdsPrivacyOptionsResult {
  const nativeAds = getNativeAdsModule();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!nativeAds) return;
    let cancelled = false;
    nativeAds.AdsConsent.getConsentInfo()
      .then((info) => {
        if (!cancelled) {
          setVisible(
            info.privacyOptionsRequirementStatus ===
              nativeAds.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [nativeAds]);

  return {
    visible,
    open: () => {
      nativeAds?.AdsConsent.showPrivacyOptionsForm().catch(() => {});
    },
  };
}
