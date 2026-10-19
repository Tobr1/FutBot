import { Badge } from "@/components/ui/badge";
import { MATCH_STATUS_LABELS, MATCH_STATUS_TONE, type MatchStatus } from "@/domain/matches/status";
import { cn } from "@/lib/utils";

/** Estado del partido como badge suave. "Falta resultado" si la hora ya pasó. */
export function MatchStatusBadge({
  status,
  pendingResult = false,
  size = "sm",
  className,
}: {
  status: MatchStatus;
  pendingResult?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  if (pendingResult && status === "scheduled") {
    return (
      <Badge tone="warning" size={size} className={className}>
        Falta resultado
      </Badge>
    );
  }
  return (
    <Badge tone={MATCH_STATUS_TONE[status]} size={size} className={cn(className)}>
      {status === "in_progress" && (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />
      )}
      {MATCH_STATUS_LABELS[status]}
    </Badge>
  );
}
