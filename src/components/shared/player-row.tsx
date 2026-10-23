import type { ReactNode } from "react";
import type { Position } from "@/domain/players/positions";
import { overall } from "@/domain/players/rating";
import { cn } from "@/lib/utils";
import { ListRow } from "./list-group";
import { RatingPill } from "./player-card";
import { PositionBadge } from "./position-badge";
import { UserAvatar } from "./user-avatar";

export interface PlayerRowData {
  nickname: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  rating: number;
  /** Media de la carta (1-99); si no está, sale de `rating`. */
  overall?: number;
  primaryPosition: Position | null;
  isActive?: boolean;
  stats?: { matches: number; goals: number; assists: number };
}

const RANK_COLORS: Record<number, string> = {
  1: "text-medal-1",
  2: "text-medal-2",
  3: "text-medal-3",
};

/**
 * Fila de jugador para listas (top del grupo, plantel en modo lista, Más).
 * Usar dentro de <ListGroup>.
 */
export function PlayerRow({
  player,
  href,
  rank,
  trailing,
  transitionTypes,
  className,
}: {
  player: PlayerRowData;
  href?: string;
  /** Puesto en un ranking: 1-3 con color de medalla. */
  rank?: number;
  /** Reemplaza la píldora de valoración. */
  trailing?: ReactNode;
  transitionTypes?: string[];
  className?: string;
}) {
  const leading = (
    <>
      {rank !== undefined && (
        <span
          className={cn(
            "w-6 text-center font-display text-lg font-bold tabular",
            RANK_COLORS[rank] ?? "text-muted-foreground",
          )}
        >
          {rank}
        </span>
      )}
      <UserAvatar name={player.nickname} src={player.avatarUrl} size="sm" />
    </>
  );

  const statsLine = player.stats ? `PJ ${player.stats.matches} · G ${player.stats.goals}` : player.fullName;
  const subtitle =
    player.primaryPosition || statsLine ? (
      <span className="flex min-w-0 items-center gap-1.5">
        {player.primaryPosition && <PositionBadge position={player.primaryPosition} size="sm" />}
        {statsLine && <span className="truncate tabular">{statsLine}</span>}
      </span>
    ) : undefined;

  return (
    <ListRow
      leading={leading}
      title={player.nickname}
      subtitle={subtitle}
      trailing={trailing ?? <RatingPill rating={player.rating} value={player.overall} size="md" />}
      href={href}
      transitionTypes={href ? (transitionTypes ?? ["nav-forward"]) : undefined}
      aria-label={href ? `${player.nickname}, media ${player.overall ?? overall(player.rating)}` : undefined}
      className={cn(player.isActive === false && "opacity-60", className)}
    />
  );
}
