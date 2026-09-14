import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  min?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export function QuantityStepper({
  value,
  min = 1,
  onIncrement,
  onDecrement,
  onChange,
  disabled,
  className,
}: QuantityStepperProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={onDecrement}
        disabled={disabled || value <= min}
        aria-label="Disminuir cantidad"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        disabled={disabled}
        aria-label="Cantidad"
        onChange={(event) => {
          if (!onChange) return;
          const next = Number(event.target.value);
          if (Number.isInteger(next) && next >= min) onChange(next);
        }}
        className="h-7 w-12 rounded-md border border-border bg-background text-center text-sm tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={onIncrement}
        disabled={disabled}
        aria-label="Aumentar cantidad"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
