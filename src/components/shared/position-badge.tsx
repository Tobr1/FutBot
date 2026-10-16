import { POSITION_LABELS, type Position } from "@/domain/players/positions";
import { cn } from "@/lib/utils";

const POSITION_STYLES: Record<Position, string> = {
  goalkeeper: "bg-warning/15 text-warning ring-warning/30",
  defender: "bg-success/15 text-success ring-success/30",
  midfielder: "bg-primary/15 text-primary ring-primary/30",
  forward: "bg-destructive/15 text-destructive ring-destructive/30",
};

export function PositionBadge({
  position,
  variant = "short",
  muted = false,
  className,
}: {
  position: Position;
  variant?: "short" | "long";
  muted?: boolean;
  className?: string;
}) {
  const label = POSITION_LABELS[position];
  return (
    <span
      title={label.long}
      className={cn(
        "inline-flex h-6 items-center rounded-md px-1.5 font-display text-xs font-bold tracking-wider uppercase ring-1",
        muted ? "bg-muted text-muted-foreground ring-border" : POSITION_STYLES[position],
        className,
      )}
    >
      {label[variant]}
    </span>
  );
}
