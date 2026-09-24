import { useEffect, useState } from "react";
import { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus } from "react-native-google-mobile-ads";

export interface UseAdsPrivacyOptionsResult {
  /** Solo `true` para usuarios donde el UMP de Google exige poder revisar el consentimiento
   *  después (ej. EEA/UK) — evita mostrar un botón sin sentido al resto. */
  visible: boolean;
  open: () => void;
}

/**
 * "Opciones de privacidad de anuncios" — Google exige que además del formulario de consentimiento
 * inicial (ver `_layout.tsx`, `AdsConsent.gatherConsent()`), el usuario pueda volver a abrirlo
 * después para cambiar de opinión. `showPrivacyOptionsForm()` es la API del propio SDK para eso.
 */
export function useAdsPrivacyOptions(): UseAdsPrivacyOptionsResult {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AdsConsent.getConsentInfo()
      .then((info) => {
        if (!cancelled) {
          setVisible(
            info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    visible,
    open: () => {
      AdsConsent.showPrivacyOptionsForm().catch(() => {});
    },
  };
}
