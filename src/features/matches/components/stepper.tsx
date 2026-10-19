"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_TEXT = { default: "", "team-a": "text-team-a", "team-b": "text-team-b" } as const;
const TONE_PLUS = {
  default: "",
  "team-a": "bg-team-a/18 text-team-a ring-team-a/30",
  "team-b": "bg-team-b/18 text-team-b ring-team-b/30",
} as const;

/**
 * Contador con botones −/+ de 44px o más. `size="xl"` es el del marcador
 * (vertical: + arriba, número grande, − abajo); `sm` el de goles y
 * asistencias por jugador, en una fila compacta. El valor se anuncia con
 * aria-live para quien usa lector de pantalla.
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  size = "sm",
  tone = "default",
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Qué cuenta, para los nombres accesibles ("goles de Juanchi"). */
  label: string;
  size?: "sm" | "xl";
  tone?: keyof typeof TONE_TEXT;
  className?: string;
}) {
  const xl = size === "xl";
  const button = cn(
    "pressable grid shrink-0 place-items-center rounded-full ring-1 ring-hairline ring-inset disabled:opacity-35",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    xl ? "size-14 bg-surface-3" : "size-11 bg-surface-2",
  );
  const icon = xl ? "size-6" : "size-4";

  const minus = (
    <button
      type="button"
      className={button}
      onClick={() => onChange(Math.max(min, value - 1))}
      disabled={value <= min}
      aria-label={`Restar ${label}`}
    >
      <Minus className={icon} strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
  const plus = (
    <button
      type="button"
      className={cn(button, xl && TONE_PLUS[tone])}
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
      aria-label={`Sumar ${label}`}
    >
      <Plus className={icon} strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
  const output = (
    <output
      aria-live="polite"
      aria-label={label}
      className={cn(
        "text-center font-display font-extrabold tabular",
        xl ? "min-w-16 text-[4rem] leading-none" : "w-6 text-xl leading-none",
        value === 0 && !xl && "text-muted-foreground/70",
        TONE_TEXT[tone],
      )}
    >
      {value}
    </output>
  );

  return (
    <div role="group" aria-label={label} className={cn("flex items-center", xl ? "flex-col gap-2" : "gap-1", className)}>
      {xl ? (
        <>
          {plus}
          {output}
          {minus}
        </>
      ) : (
        <>
          {minus}
          {output}
          {plus}
        </>
      )}
    </div>
  );
}
