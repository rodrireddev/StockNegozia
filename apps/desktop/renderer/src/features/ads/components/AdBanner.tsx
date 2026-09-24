import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { recordHouseAdImpression } from "../api/ads.api";
import { useActiveHouseAd } from "../hooks/useActiveHouseAd";

/**
 * Banner pasivo en el sidebar derecho — nunca otorga créditos ni interrumpe nada (doc
 * ADS_CREDITS_GAMIFICATION.md: "apps/desktop nunca es fuente de créditos, solo sink"). Por ahora
 * solo consume el house ad propio (siempre público, sin cuenta — `apps/desktop` no tiene sistema
 * de login cloud todavía). El día que haya una cuenta real de Adsterra confirmada, este mismo
 * lugar pasa a pedir `GET /ads/placements/:key?platform=desktop` además de esto, mismo patrón que
 * ya usa `mobile-mini` para el rewarded ad (`ad_placements`, con kill switch desde el panel).
 *
 * Si no hay ningún house ad activo, o el cloud-backend no responde, no se renderiza nada — jamás
 * un banner roto ni un espacio vacío llamativo en la interfaz principal de venta.
 */
export function AdBanner() {
  const houseAdQuery = useActiveHouseAd();
  const houseAd = houseAdQuery.data;
  const recordedForId = useRef<string | null>(null);

  useEffect(() => {
    if (!houseAd || recordedForId.current === houseAd.id) return;
    recordedForId.current = houseAd.id;
    recordHouseAdImpression(houseAd.id).catch(() => {});
  }, [houseAd]);

  if (!houseAd) return null;

  return (
    <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-border bg-secondary/40 p-4 lg:block">
      <Card className="overflow-hidden p-0">
        {houseAd.imageUrl && (
          <img src={houseAd.imageUrl} alt="" className="h-32 w-full object-cover" />
        )}
        <div className="flex flex-col gap-2 p-4">
          <p className="text-sm font-semibold">{houseAd.title}</p>
          {houseAd.body && <p className="text-xs text-muted-foreground">{houseAd.body}</p>}
          <a
            href={houseAd.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {houseAd.ctaLabel}
          </a>
        </div>
      </Card>
    </aside>
  );
}
