import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { LinkPending } from "@/components/shared/link-pending";
import { RatingPill } from "@/components/shared/player-card";
import { PositionBadge } from "@/components/shared/position-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { PlayerListItem } from "../queries";

/** Acceso directo a la ficha propia desde el inicio del grupo. */
export function MyPlayerStrip({
  slug,
  player,
  className,
}: {
  slug: string;
  player: PlayerListItem;
  className?: string;
}) {
  const { matches, goals, assists } = player.stats;
  return (
    <Link
      href={routes.player(slug, player.id)}
      transitionTypes={["nav-forward"]}
      className={cn(
        "panel pressable relative flex min-h-20 items-center gap-3 rounded-xl px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <UserAvatar name={player.nickname} src={player.avatarUrl} size="md" priority />
      <div className="min-w-0 flex-1">
        <p className="text-2xs font-semibold tracking-[0.12em] text-primary uppercase">Tu ficha</p>
        <p className="truncate font-display text-xl leading-tight font-bold tracking-wide uppercase">{player.nickname}</p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {player.positions.primary && <PositionBadge position={player.positions.primary} size="sm" />}
          <span className="truncate tabular" aria-hidden="true">
            PJ {matches} · G {goals} · A {assists}
          </span>
          <span className="sr-only">
            {matches} partidos, {goals} goles, {assists} asistencias
          </span>
        </p>
      </div>
      <RatingPill rating={player.rating} value={player.card.overall} size="lg" />
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <LinkPending />
    </Link>
  );
}
