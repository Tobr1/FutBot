import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Tile de una estadística suelta. Para varias en fila, preferir <StatStrip>. */
export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  tone?: "default" | "success" | "danger" | "gold" | "primary";
  className?: string;
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    danger: "text-destructive",
    gold: "text-gold",
    primary: "text-primary",
  }[tone];

  return (
    <div className={cn("panel rounded-xl p-3", className)}>
      <div className="flex items-center gap-1.5 text-2xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {Icon && <Icon className="size-3.5" aria-hidden="true" />}
        {label}
      </div>
      <p className={cn("mt-1 font-display text-3xl leading-none font-extrabold tabular", toneClass)}>{value}</p>
    </div>
  );
}
