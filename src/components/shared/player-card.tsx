import { Crown, Link2Off, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { ATTRIBUTES, type AttributeKind, CARD_TIER_LABELS, type CardTier, cardTier } from "@/domain/cards/cards";
import type { Position } from "@/domain/players/positions";
import { overall } from "@/domain/players/rating";
import { cn } from "@/lib/utils";
import { PositionBadge } from "./position-badge";
import { CARD_STYLES } from "./tier-styles";
import { UserAvatar } from "./user-avatar";

/** Lo que muestra la carta cuando ya hay un modelo calculado (ver domain/cards). */
export interface PlayerCardModel {
  overall: number;
  tier: CardTier;
  elite: boolean;
  provisional: boolean;
  attributes: { kind: AttributeKind; values: number[] } | null;
}

export interface PlayerCardData {
  nickname: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  /** Valoración por partidos (1-10): se usa si no llega `card`. */
  rating: number;
  primaryPosition: Position | null;
  secondaryPosition?: Position | null;
  isProvisional?: boolean;
  isLinked?: boolean;
  isActive?: boolean;
  stats?: { matches: number; goals: number; mvps?: number };
  /** Carta calculada (media de atributos, nivel, élite). */
  card?: PlayerCardModel | null;
}

/** Recorte de esquinas de la carta (octógono suave), en % del tamaño. */
const CARD_SHAPE = "polygon(9% 0, 91% 0, 100% 7%, 100% 93%, 91% 100%, 9% 100%, 0 93%, 0 7%)";

function resolveCard(player: PlayerCardData): PlayerCardModel {
  if (player.card) return player.card;
  const value = overall(player.rating);
  return { overall: value, tier: cardTier(value), elite: false, provisional: player.isProvisional ?? false, attributes: null };
}

/**
 * Carta FulBot: media, posición, foto, nombre y los seis atributos (o, si
 * todavía no hay, partidos/goles/MVP). Bronce, plata y oro según la
 * media; la edición Élite (10 MVP) solo cambia el diseño.
 *
 * Se dimensiona con unidades de contenedor (cqw): todo escala con el ancho de
 * la carta, desde la grilla de 2 columnas de un teléfono (~160 px) hasta la
 * ficha. El contenedor es el <article>; el contenido va en un hijo.
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
  const card = resolveCard(player);
  const style = CARD_STYLES[card.elite ? "elite" : card.tier];
  const Heading = headingLevel;
  const defs = card.attributes ? ATTRIBUTES[card.attributes.kind] : null;
  const tierLabel = card.elite ? "Élite" : CARD_TIER_LABELS[card.tier];

  return (
    <article
      className={cn(
        "group @container relative isolate aspect-[3/4] transition-transform duration-200 [@media(hover:hover)]:hover:-translate-y-0.5",
        style.frame,
        player.isActive === false && "opacity-55 grayscale",
        className,
      )}
    >
      {/* Marco: el mismo recorte, un poco más grande, con el brillo del nivel. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-20"
        style={{ clipPath: CARD_SHAPE, background: style.ring }}
      />
      <div
        className={cn("absolute inset-[1.5px] -z-10 overflow-hidden", style.face)}
        style={{ clipPath: CARD_SHAPE }}
        aria-hidden="true"
      >
        <span className="pitch-lines absolute inset-0 opacity-30" />
        {card.elite && (
          <span className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,oklch(0.7_0.2_255/45%),transparent_55%)]" />
        )}
      </div>

      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] px-[8cqw] pt-[7cqw] pb-[6cqw]">
        <div className="flex items-start justify-between gap-[2cqw]">
          <div className="min-w-0">
            <p className={cn("font-display text-[22cqw]/[0.85] font-extrabold tabular", style.text)}>
              <span className="sr-only">Media </span>
              {card.overall}
            </p>
            {player.primaryPosition && (
              <PositionBadge position={player.primaryPosition} size="sm" className="mt-[2.5cqw] bg-black/30" />
            )}
          </div>
          <div className="flex flex-col items-end gap-[2cqw]">
            <span
              className={cn(
                "inline-flex items-center gap-[1.5cqw] font-display text-[max(0.6875rem,5.5cqw)] leading-none font-bold tracking-[0.18em] uppercase",
                style.text,
              )}
            >
              {card.elite && <Crown className="size-[max(0.75rem,6cqw)]" aria-hidden="true" />}
              {tierLabel}
            </span>
            {player.isLinked === false && (
              <span role="img" aria-label="Sin cuenta vinculada" className="text-white/50">
                <Link2Off className="size-3.5" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col items-center justify-center gap-[2cqw]">
          <UserAvatar
            name={player.nickname}
            src={player.avatarUrl}
            size="xl"
            priority={priority}
            className="size-[36cqw] max-h-28 max-w-28 text-[min(14cqw,2.25rem)] shadow-2xl ring-2 ring-white/20"
          />
        </div>

        <div className="min-w-0 text-center">
          <Heading className="line-clamp-1 font-display text-[11.5cqw]/none font-extrabold tracking-wide wrap-anywhere text-white uppercase">
            {player.nickname}
          </Heading>
          {card.provisional ? (
            <p className="mx-auto mt-[1.5cqw] inline-flex items-center gap-[1cqw] rounded-full bg-black/30 px-[3cqw] py-[0.5cqw] text-[max(0.625rem,5cqw)] font-medium text-white/80">
              <Sparkles className="size-[max(0.625rem,4.5cqw)]" aria-hidden="true" />
              Provisional
            </p>
          ) : (
            showFullName &&
            player.fullName && (
              <p className="mt-[1.5cqw] hidden truncate text-[max(0.6875rem,5.5cqw)] leading-tight text-white/65 @[190px]:block">
                {player.fullName}
              </p>
            )
          )}

          {card.attributes && defs ? (
            <dl className="mt-[3cqw] grid grid-cols-6 gap-[0.5cqw] rounded-[3cqw] bg-black/30 px-[1cqw] py-[2.5cqw] text-white">
              {defs.map((def, i) => (
                <AttributeStat key={def.code} code={def.code} label={def.label} value={card.attributes!.values[i]} ring={style.ring} />
              ))}
            </dl>
          ) : (
            player.stats && (
              <dl className="mt-[3cqw] grid grid-cols-3 rounded-[3cqw] bg-black/25 py-[2.5cqw] text-white">
                <CardStat label="PJ" srLabel="Partidos jugados" value={player.stats.matches} />
                <CardStat label="G" srLabel="Goles" value={player.stats.goals} />
                <CardStat label="MVP" srLabel="Jugador del partido" value={player.stats.mvps ?? 0} />
              </dl>
            )
          )}
        </div>
      </div>
    </article>
  );
}

/** Atributo con un aro que se llena según el valor (1-99). */
function AttributeStat({ code, label, value, ring }: { code: string; label: string; value: number; ring: string }) {
  return (
    <div className="flex min-w-0 flex-col-reverse items-center gap-[1cqw]">
      <dt className="text-[max(0.5rem,4.2cqw)]/none font-semibold text-white/65">
        <span aria-hidden="true">{code}</span>
        <span className="sr-only">{label}</span>
      </dt>
      <dd
        className="grid aspect-square w-full max-w-[13cqw] place-items-center rounded-full font-display text-[max(0.625rem,5.8cqw)]/none font-bold tabular"
        style={
          {
            background: `radial-gradient(closest-side, oklch(0.16 0.02 262) 76%, transparent 78% 100%), conic-gradient(${ring} ${value}%, rgb(255 255 255 / 0.14) 0)`,
          } as CSSProperties
        }
      >
        {value}
      </dd>
    </div>
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

/** Píldora compacta de valoración para listas (mismo color de nivel que la carta). */
export function RatingPill({
  rating,
  value,
  size = "md",
  className,
}: {
  /** Valoración por partidos (1-10). */
  rating: number;
  /** Media de la carta (1-99), si ya se calculó; si no, sale de `rating`. */
  value?: number;
  size?: keyof typeof PILL_SIZES;
  className?: string;
}) {
  const shown = value ?? overall(rating);
  const style = CARD_STYLES[cardTier(shown)];
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center font-display font-extrabold tabular ring-1 ring-white/10",
        PILL_SIZES[size],
        style.face,
        style.text,
        className,
      )}
    >
      <span className="sr-only">Valoración </span>
      {shown}
    </span>
  );
}
