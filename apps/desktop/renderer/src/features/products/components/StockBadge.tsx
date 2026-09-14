import type { StockStatus } from "@stocknegozia/api-contracts";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<StockStatus, string> = {
  normal: "Stock normal",
  low: "Stock bajo",
  out: "Sin stock",
};

const VARIANTS: Record<StockStatus, "success" | "warning" | "destructive"> = {
  normal: "success",
  low: "warning",
  out: "destructive",
};

export function StockBadge({ status }: { status: StockStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
