import { formatMoney } from "@stocknegozia/shared";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "positive" | "negative" | "warning";

const TONE_CLASS: Record<StatTone, string> = {
  default: "",
  positive: "text-success",
  negative: "text-destructive",
  warning: "text-warning",
};

/** Un valor con su etiqueta SIEMPRE arriba (nunca un número suelto que se confunda con otro). */
export function Stat({
  label,
  value,
  hint,
  tone = "default",
  large,
}: {
  label: string;
  value: number;
  hint?: ReactNode;
  tone?: StatTone;
  large?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "break-words font-semibold tabular-nums",
          large ? "text-2xl" : "text-lg",
          TONE_CLASS[tone],
        )}
        title={formatMoney(value)}
      >
        {formatMoney(value)}
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Grilla de `Stat`s dentro de una tarjeta — se apila en anchos chicos. */
export function StatsCard({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  return (
    <Card>
      <CardContent
        className={cn(
          "grid grid-cols-1 gap-4 p-4",
          columns === 2 && "sm:grid-cols-2",
          columns === 3 && "sm:grid-cols-3",
          columns === 4 && "sm:grid-cols-2 xl:grid-cols-4",
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

/** Tarjeta-resumen del Resumen que lleva a su vista de detalle. */
export function KpiLinkCard({
  to,
  title,
  icon,
  children,
}: {
  to: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group block rounded-lg border border-border bg-background p-4 transition-colors hover:bg-accent"
    >
      <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
      {children}
    </Link>
  );
}
