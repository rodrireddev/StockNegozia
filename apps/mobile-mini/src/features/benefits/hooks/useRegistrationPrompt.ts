import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "@/accounts/AccountContext";
import { fetchProducts } from "@/data/products";
import { salesRepository } from "@/features/sales/data/repository";
import { dismissRegistrationPrompt, isRegistrationPromptDismissed } from "../registrationPromptStore";

type Tier = "low" | "high";

interface TierRule {
  tier: Tier;
  products: number;
  sales: number;
}

/**
 * Disparador del CTA de registro (doc §3), ajustado a lo que existe sin cuenta: productos
 * cargados y ventas hechas (ambos ya se trackean en el SQLite local con o sin este sistema). Se
 * sacaron "racha"/"créditos acumulados" del disparador original — esos ya no existen antes de
 * tener cuenta (ver doc §3, decisión). Dos escalones ("low"/"high") en vez de uno: descartar el
 * de umbral bajo no debería silenciar el de umbral alto más adelante.
 */
const TIERS: TierRule[] = [
  { tier: "high", products: 100, sales: 100 },
  { tier: "low", products: 15, sales: 20 },
];

export function useRegistrationPrompt() {
  const { status } = useAccount();
  const [dismissedTier, setDismissedTier] = useState<Tier | null>(null);

  const productsQuery = useQuery({
    queryKey: ["registration-prompt", "products-count"],
    queryFn: async () => (await fetchProducts({})).length,
    enabled: status === "unauthenticated",
  });
  const salesQuery = useQuery({
    queryKey: ["registration-prompt", "sales-count"],
    queryFn: async () => salesRepository.findMany().length,
    enabled: status === "unauthenticated",
  });

  const eligibleTier =
    status === "unauthenticated" && productsQuery.data !== undefined && salesQuery.data !== undefined
      ? (TIERS.find((rule) => productsQuery.data! >= rule.products || salesQuery.data! >= rule.sales)
          ?.tier ?? null)
      : null;

  useEffect(() => {
    if (!eligibleTier) {
      setDismissedTier(null);
      return;
    }
    let cancelled = false;
    isRegistrationPromptDismissed(eligibleTier).then((dismissed) => {
      if (!cancelled) setDismissedTier(dismissed ? eligibleTier : null);
    });
    return () => {
      cancelled = true;
    };
  }, [eligibleTier]);

  return {
    visible: eligibleTier !== null && dismissedTier !== eligibleTier,
    dismiss: () => {
      if (!eligibleTier) return;
      setDismissedTier(eligibleTier);
      dismissRegistrationPrompt(eligibleTier);
    },
  };
}
