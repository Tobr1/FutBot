import { Link2Off, Sparkles } from "lucide-react";
import type { Position } from "@/domain/players/positions";
import { overall, ratingTier, TIER_LABELS, type RatingTier } from "@/domain/players/rating";
import { cn } from "@/lib/utils";
import { PositionBadge } from "./position-badge";
import { UserAvatar } from "./user-avatar";

const TIER_STYLES: Record<RatingTier, { card: string; glow: string; text: string }> = {
  promesa: {
    card: "from-[oklch(0.42_0.07_50)] via-[oklch(0.25_0.04_40)] to-[oklch(0.17_0.02_262)]",
    glow: "bg-[oklch(0.6_0.1_55/35%)]",
    text: "text-[oklch(0.85_0.07_60)]",
  },
  titular: {
    card: "from-[oklch(0.5_0.02_250)] via-[oklch(0.28_0.025_255)] to-[oklch(0.17_0.02_262)]",
    glow: "bg-[oklch(0.8_0.02_250/30%)]",
    text: "text-[oklch(0.92_0.01_250)]",
  },
  figura: {
    card: "from-[oklch(0.62_0.12_85)] via-[oklch(0.32_0.06_75)] to-[oklch(0.17_0.02_262)]",
    glow: "bg-[oklch(0.84_0.13_88/35%)]",
    text: "text-gold",
  },
  crack: {
    card: "from-[oklch(0.55_0.2_265)] via-[oklch(0.3_0.12_280)] to-[oklch(0.15_0.03_262)]",
    glow: "bg-[oklch(0.62_0.2_258/45%)]",
    text: "text-[oklch(0.85_0.12_245)]",
  },
};

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

/** Tarjeta de jugador con tier de color según la valoración. */
export function PlayerCard({ player, className }: { player: PlayerCardData; className?: string }) {
  const tier = ratingTier(player.rating);
  const style = TIER_STYLES[tier];

  return (
    <article
      className={cn(
        "group relative isolate flex aspect-[3/4] flex-col overflow-hidden rounded-2xl bg-gradient-to-b p-3 ring-1 ring-white/10 transition-transform duration-200 hover:-translate-y-0.5",
        style.card,
        !player.isActive && player.isActive !== undefined && "opacity-55 grayscale",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("absolute -top-10 -right-10 -z-10 size-32 rounded-full blur-2xl", style.glow)} />
      <span aria-hidden="true" className="pitch-lines absolute inset-0 -z-10 opacity-40" />

      <div className="flex items-start justify-between">
        <div className="leading-none">
          <p className={cn("font-display text-4xl font-extrabold tabular", style.text)}>{overall(player.rating)}</p>
          <div className="mt-1.5 flex gap-1">
            {player.primaryPosition && <PositionBadge position={player.primaryPosition} className="bg-black/25" />}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn("font-display text-[10px] font-bold tracking-[0.2em] uppercase", style.text)}>
            {TIER_LABELS[tier]}
          </span>
          {player.isProvisional && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
              <Sparkles className="size-3" aria-hidden="true" />
              Provisional
            </span>
          )}
          {player.isLinked === false && (
            <span title="Sin cuenta vinculada" className="text-white/50">
              <Link2Off className="size-3.5" aria-label="Sin cuenta vinculada" />
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <UserAvatar name={player.nickname} src={player.avatarUrl} size="xl" className="shadow-2xl ring-2 ring-white/15" />
      </div>

      <div className="space-y-2 text-center">
        <div>
          <h3 className="truncate font-display text-xl leading-none font-extrabold tracking-wide text-white uppercase">
            {player.nickname}
          </h3>
          {player.fullName && <p className="mt-0.5 truncate text-[11px] text-white/60">{player.fullName}</p>}
        </div>
        {player.stats && (
          <dl className="grid grid-cols-3 gap-1 rounded-lg bg-black/25 py-1.5 text-white">
            <CardStat label="PJ" value={player.stats.matches} />
            <CardStat label="G" value={player.stats.goals} />
            <CardStat label="A" value={player.stats.assists} />
          </dl>
        )}
      </div>
    </article>
  );
}

function CardStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="leading-none">
      <dd className="font-display text-base font-bold tabular">{value}</dd>
      <dt className="mt-0.5 text-[10px] tracking-wider text-white/55 uppercase">{label}</dt>
    </div>
  );
}

/** Píldora compacta de valoración para listas. */
export function RatingPill({ rating, className }: { rating: number; className?: string }) {
  const style = TIER_STYLES[ratingTier(rating)];
  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-10 items-center justify-center rounded-lg bg-gradient-to-b px-2 font-display text-base font-extrabold tabular ring-1 ring-white/10",
        style.card,
        style.text,
        className,
      )}
    >
      {overall(rating)}
    </span>
  );
}
