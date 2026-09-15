import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { usePairDevice } from "@/features/pairing/hooks/usePairDevice";
import type { ParsedPairingPayload } from "@/features/pairing/parsePairingPayload";
import { acceptTerms, hasAcceptedTerms } from "@/config/termsStore";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useDeviceSize } from "@/hooks/useDeviceSize";
import { InstructionsStep } from "../components/steps/InstructionsStep";
import { TermsStep } from "../components/steps/TermsStep";
import { ScanStep } from "../components/steps/ScanStep";
import { VerifyStep } from "../components/steps/VerifyStep";
import { NameStep } from "../components/steps/NameStep";

type Step = "instructions" | "terms" | "scan" | "verify" | "name";

/**
 * Wizard de emparejamiento — instrucciones → términos → escanear QR → código de verificación →
 * nombre del dispositivo → sincronizado. La URL del backend NUNCA se le pide a la persona: se
 * arma automáticamente a partir de `host`/`port` del propio QR escaneado
 * (`ParsedPairingPayload.backendUrl`, ver `parsePairingPayload.ts`) — es un detalle interno de
 * red, no algo que el usuario del celular tenga que conocer o escribir.
 */
export function PairingScreen() {
  const auth = useAuth();
  const { isTablet } = useDeviceSize();
  const pairMutation = usePairDevice();

  const [step, setStep] = useState<Step>("instructions");
  const [termsAlreadyAccepted, setTermsAlreadyAccepted] = useState(false);
  const [scanned, setScanned] = useState<ParsedPairingPayload | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    hasAcceptedTerms().then((accepted) => {
      if (!cancelled) setTermsAlreadyAccepted(accepted);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleScanned(payload: ParsedPairingPayload) {
    setScanned(payload);
    setStep("verify");
  }

  function handleVerifyNext(code: string) {
    setVerificationCode(code);
    setStep("name");
  }

  async function handleNameSubmit(deviceName: string) {
    if (!scanned) return;
    setSubmitError(null);
    await auth.configureBackendUrl(scanned.backendUrl);

    pairMutation.mutate(
      {
        pairingId: scanned.pairingId,
        token: scanned.token,
        verificationCode,
        deviceName: deviceName || undefined,
        deviceType: isTablet ? "tablet" : "mobile",
      },
      {
        onError: (error) => {
          setSubmitError(
            error instanceof Error ? error.message : "No se pudo emparejar el dispositivo.",
          );
        },
      },
    );
  }

  return (
    <ScreenContainer>
      {step === "instructions" && (
        <InstructionsStep onNext={() => setStep(termsAlreadyAccepted ? "scan" : "terms")} />
      )}
      {step === "terms" && (
        <TermsStep
          onNext={async () => {
            await acceptTerms();
            setTermsAlreadyAccepted(true);
            setStep("scan");
          }}
          onBack={() => setStep("instructions")}
        />
      )}
      {step === "scan" && (
        <ScanStep
          onScanned={handleScanned}
          onBack={() => setStep(termsAlreadyAccepted ? "instructions" : "terms")}
        />
      )}
      {step === "verify" && <VerifyStep onNext={handleVerifyNext} onBack={() => setStep("scan")} />}
      {step === "name" && (
        <NameStep
          onSubmit={handleNameSubmit}
          onBack={() => setStep("verify")}
          isPending={pairMutation.isPending}
          error={submitError}
        />
      )}
    </ScreenContainer>
  );
}
