import type { CSSProperties } from "react";
import { POSITION_LABELS, type Position } from "@/domain/players/positions";
import { cn } from "@/lib/utils";

/**
 * Color de categoría por posición (nunca semántico: no usa success,
 * destructive ni warning). Sirve para puntos de filtros y acentos.
 */
export const POSITION_COLOR_VAR: Record<Position, string> = {
  goalkeeper: "var(--pos-gk)",
  defender: "var(--pos-def)",
  midfielder: "var(--pos-mid)",
  forward: "var(--pos-fwd)",
};

const SIZES = {
  sm: "h-5 rounded px-1 text-2xs",
  md: "h-6 rounded-md px-1.5 text-xs",
} as const;

export function PositionBadge({
  position,
  variant = "short",
  muted = false,
  size = "md",
  className,
}: {
  position: Position;
  variant?: "short" | "long";
  muted?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const label = POSITION_LABELS[position];
  return (
    <span
      data-pos={position}
      // --pos también llega por [data-pos] en globals.css; el inline lo hace autosuficiente.
      style={{ "--pos": POSITION_COLOR_VAR[position] } as CSSProperties}
      className={cn(
        "relative inline-flex shrink-0 items-center font-display leading-none font-bold tracking-wider uppercase",
        SIZES[size],
        muted
          ? "bg-muted text-muted-foreground ring-1 ring-hairline ring-inset"
          : "bg-[color-mix(in_oklch,var(--pos)_16%,transparent)] text-[var(--pos)] ring-1 ring-[color-mix(in_oklch,var(--pos)_32%,transparent)] ring-inset",
        className,
      )}
    >
      <span aria-hidden="true">{label[variant]}</span>
      <span className="sr-only">{label.long}</span>
    </span>
  );
}
