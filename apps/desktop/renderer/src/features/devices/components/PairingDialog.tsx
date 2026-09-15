import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getUserFriendlyError } from "@/lib/errors";
import { useCancelPairing } from "../hooks/useCancelPairing";
import { useCreatePairing } from "../hooks/useCreatePairing";
import { usePairingStatus } from "../hooks/usePairingStatus";

interface PairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function useCountdown(expiresAt: string | undefined): number {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();
    const tick = () => setSecondsLeft(Math.max(0, Math.round((target - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return secondsLeft;
}

/**
 * El token/código nunca se loggean (`console.log`) acá — ver docs/security/NEXT_STEPS.md
 * §Seguridad del frontend. La credential del dispositivo que confirma nunca pasa por este
 * Desktop: solo se ve el nombre/tipo del device una vez emparejado.
 */
export function PairingDialog({ open, onOpenChange }: PairingDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const createPairing = useCreatePairing();
  const cancelPairing = useCancelPairing();
  const pairingId = createPairing.data?.pairingId;
  const status = usePairingStatus(open ? pairingId : undefined);
  const secondsLeft = useCountdown(createPairing.data?.expiresAt);

  useEffect(() => {
    if (status.data?.status === "confirmed") {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    }
  }, [status.data?.status, queryClient]);

  const { mutate: startPairing } = createPairing;
  useEffect(() => {
    if (open) startPairing();
  }, [open, startPairing]);

  useEffect(() => {
    if (!createPairing.data) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(JSON.stringify(createPairing.data.qr))
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [createPairing.data]);

  function handleClose(nextOpen: boolean) {
    if (nextOpen) return;
    if (pairingId && status.data?.status === "pending") {
      cancelPairing.mutate(pairingId);
    }
    onOpenChange(false);
    createPairing.reset();
  }

  const currentStatus = status.data?.status;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Emparejar nuevo dispositivo</DialogTitle>
          <DialogDescription>
            Escaneá el QR (o pegá su contenido) desde el otro dispositivo y escribí el código de
            verificación cuando lo pida.
          </DialogDescription>
        </DialogHeader>

        {createPairing.isPending && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generando pairing…
          </div>
        )}

        {createPairing.isError && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
            {getUserFriendlyError(createPairing.error)}
          </p>
        )}

        {createPairing.data && currentStatus !== "confirmed" && currentStatus !== "expired" && (
          <div className="flex flex-col items-center gap-3">
            {qrDataUrl && <img src={qrDataUrl} alt="Código QR de pairing" className="h-48 w-48" />}
            <div className="text-center">
              <p className="text-xs uppercase text-muted-foreground">Código de verificación</p>
              <p className="text-3xl font-mono font-semibold tracking-widest">
                {createPairing.data.verificationCode}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Expira en {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </p>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Cancelar pairing
            </Button>
          </div>
        )}

        {currentStatus === "confirmed" && (
          <div className="space-y-3 py-4 text-center">
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-400">
              Dispositivo emparejado correctamente.
            </p>
            <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
          </div>
        )}

        {currentStatus === "expired" && (
          <div className="space-y-3 py-4 text-center">
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-400">
              El pairing expiró antes de confirmarse.
            </p>
            <Button variant="outline" onClick={() => createPairing.mutate()}>
              Generar uno nuevo
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
