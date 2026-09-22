import { CashAdjustmentCard } from "@/features/cash-adjustments/components/CashAdjustmentCard";
import type { ProfitLedgerEntry } from "../data/ledger";
import { ProfitCard } from "./ProfitCard";

/** Una línea del historial combinado — venta o ajuste de caja, ver `features/profits/data/ledger.ts`. */
export function ProfitLedgerListItem({ entry }: { entry: ProfitLedgerEntry }) {
  if (entry.kind === "sale") return <ProfitCard entry={entry} />;
  return <CashAdjustmentCard adjustment={entry} />;
}
