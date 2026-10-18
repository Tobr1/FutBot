import { Link2Off, Sparkles } from "lucide-react";
import type { Position } from "@/domain/players/positions";
import { overall, ratingTier, TIER_LABELS } from "@/domain/players/rating";
import { cn } from "@/lib/utils";
import { PositionBadge } from "./position-badge";
import { TIER_STYLES } from "./tier-styles";
import { UserAvatar } from "./user-avatar";

export interface PlayerCardData {
  nickname: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  rating: number;
  primaryPosition: Position | null;
  secondaryPosition?: Position | null;
  isProvisional?: boolean;
  isLinked?: boolean;
  isActive?: boolean;
  stats?: { matches: number; goals: number; assists: number };
}

/**
 * Tarjeta de jugador con tier de color según la valoración.
 *
 * Se dimensiona con unidades de contenedor (cqw): todo escala con el ancho de
 * la carta, así entra completa tanto en la grilla de 2 columnas de un teléfono
 * (~160 px) como en el aside de escritorio. El contenedor es el <article>; el
 * padding va en el hijo porque un elemento no puede consultar su propio tamaño.
 */
export function PlayerCard({
  player,
  className,
  priority = false,
  headingLevel = "h3",
  showFullName = true,
}: {
  player: PlayerCardData;
  className?: string;
  /** Carga la foto con prioridad alta (carta sobre el pliegue). */
  priority?: boolean;
  headingLevel?: "h2" | "h3" | "p";
  showFullName?: boolean;
}) {
  const tier = ratingTier(player.rating);
  const style = TIER_STYLES[tier];
  const Heading = headingLevel;

  return (
    <article
      className={cn(
        "group @container relative isolate aspect-[3/4] overflow-hidden rounded-xl bg-gradient-to-b ring-1 ring-white/10 transition-transform duration-200 [@media(hover:hover)]:hover:-translate-y-0.5",
        style.card,
        player.isActive === false && "opacity-55 grayscale",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("absolute inset-0 -z-10", style.glowGradient)} />
      <span aria-hidden="true" className="pitch-lines absolute inset-0 -z-10 opacity-40" />

      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] p-[7cqw]">
        <div className="flex items-start justify-between gap-[2cqw]">
          <div className="min-w-0">
            <p className={cn("font-display text-[22cqw]/[0.85] font-extrabold tabular", style.text)}>
              <span className="sr-only">Valoración </span>
              {overall(player.rating)}
            </p>
            {player.primaryPosition && (
              <PositionBadge position={player.primaryPosition} size="sm" className="mt-[2.5cqw] bg-black/30" />
            )}
          </div>
          <div className="flex flex-col items-end gap-[2cqw]">
            <span
              className={cn(
                "font-display text-[max(0.6875rem,5.5cqw)] leading-none font-bold tracking-[0.18em] uppercase",
                style.text,
              )}
            >
              {TIER_LABELS[tier]}
            </span>
            {player.isProvisional && (
              <span
                role="img"
                aria-label="Valoración provisional"
                className="grid size-[18px] place-items-center rounded-full bg-black/30 text-white/85"
              >
                <Sparkles className="size-3" aria-hidden="true" />
              </span>
            )}
            {player.isLinked === false && (
              <span role="img" aria-label="Sin cuenta vinculada" className="text-white/50">
                <Link2Off className="size-3.5" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>

        <div className="flex min-h-0 items-center justify-center">
          <UserAvatar
            name={player.nickname}
            src={player.avatarUrl}
            size="xl"
            priority={priority}
            className="size-[38cqw] max-h-24 max-w-24 text-[min(14cqw,2.25rem)] shadow-2xl ring-2 ring-white/15"
          />
        </div>

        <div className="min-w-0 text-center">
          <Heading className="line-clamp-1 font-display text-[11.5cqw]/none font-extrabold tracking-wide wrap-anywhere text-white uppercase">
            {player.nickname}
          </Heading>
          {showFullName && player.fullName && (
            <p className="mt-[1.5cqw] hidden truncate text-[max(0.6875rem,5.5cqw)] leading-tight text-white/65 @[190px]:block">
              {player.fullName}
            </p>
          )}
          {player.stats && (
            <dl className="mt-[3cqw] grid grid-cols-3 rounded-[3cqw] bg-black/25 py-[2.5cqw] text-white">
              <CardStat label="PJ" srLabel="Partidos jugados" value={player.stats.matches} />
              <CardStat label="G" srLabel="Goles" value={player.stats.goals} />
              <CardStat label="A" srLabel="Asistencias" value={player.stats.assists} />
            </dl>
          )}
        </div>
      </div>
    </article>
  );
}

function CardStat({ label, srLabel, value }: { label: string; srLabel: string; value: number }) {
  return (
    <div className="flex min-w-0 flex-col-reverse items-center gap-[1cqw]">
      <dt className="text-[max(0.6875rem,6cqw)]/none tracking-wider text-white/60 uppercase">
        <span aria-hidden="true">{label}</span>
        <span className="sr-only">{srLabel}</span>
      </dt>
      <dd className="font-display text-[8.5cqw]/none font-bold tabular">{value}</dd>
    </div>
  );
}

const PILL_SIZES = {
  sm: "h-6 min-w-8 rounded-md px-1.5 text-sm",
  md: "h-7 min-w-10 rounded-lg px-2 text-base",
  lg: "h-9 min-w-12 rounded-lg px-2.5 text-lg",
} as const;

/** Píldora compacta de valoración para listas. */
export function RatingPill({
  rating,
  size = "md",
  className,
}: {
  rating: number;
  size?: keyof typeof PILL_SIZES;
  className?: string;
}) {
  const style = TIER_STYLES[ratingTier(rating)];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center bg-gradient-to-b font-display font-extrabold tabular ring-1 ring-white/10",
        PILL_SIZES[size],
        style.card,
        style.text,
        className,
      )}
    >
      <span className="sr-only">Valoración </span>
      {overall(rating)}
    </span>
  );
}
