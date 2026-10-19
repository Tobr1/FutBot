import { Lock } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { LinkPending } from "@/components/shared/link-pending";
import { UserAvatar } from "@/components/shared/user-avatar";
import { type Award, type AwardGroup, type AwardProgress, type MonthAwards, TIER_LABELS } from "@/domain/awards";
import { formatMatchDate } from "@/domain/matches/datetime";
import { cn } from "@/lib/utils";
import { AwardBadge, TIER_TONE } from "./award-badge";

export type PlayerNames = Record<string, { nickname: string; avatarUrl: string | null }>;

const ROW_LINK =
  "pressable-row relative flex min-h-14 items-center gap-3 px-4 py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

/** Logros ganados de un jugador: un tile por logro (los repetidos con "×N"). */
export function EarnedAwardsGrid({ groups, timeZone }: { groups: AwardGroup[]; timeZone: string }) {
  return (
    <ul className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-3" aria-label="Logros ganados">
      {groups.map(({ award, count }, i) => (
        <li
          key={award.id}
          style={{ "--i": i } as CSSProperties}
          className="panel flex animate-rise items-center gap-3 rounded-xl p-3 [animation-delay:calc(min(var(--i),8)*35ms)]"
        >
          <AwardBadge icon={award.icon} tier={award.tier} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold">{award.title}</span>
              <span className="sr-only">, {TIER_LABELS[award.tier]}</span>
              {count > 1 && (
                <span className={cn("shrink-0 font-display text-base leading-none font-extrabold tabular", TIER_TONE[award.tier].text)}>
                  ×{count}
                  <span className="sr-only"> veces</span>
                </span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{award.description}</p>
            <p className="text-2xs text-muted-foreground tabular">
              {count > 1 ? "Último: " : ""}
              {formatMatchDate(award.earnedAt, timeZone)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Logros por hitos que faltan: barra de progreso hacia el próximo escalón. */
export function AwardProgressList({ items }: { items: AwardProgress[] }) {
  return (
    <ul className="list-group" aria-label="Próximos logros">
      {items.map((item) => {
        const pct = item.target > 0 ? Math.min(100, Math.round((item.current / item.target) * 100)) : 0;
        return (
          <li key={item.key} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
            <AwardBadge icon={item.icon} tier={item.tier} size="sm" locked={!item.complete} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold">
                  {item.title}
                  {!item.complete && <span className="font-normal text-muted-foreground"> · {item.target}</span>}
                </p>
                <p className="shrink-0 text-xs text-muted-foreground tabular">
                  {item.complete ? "Completo" : `${item.current}/${item.target}`}
                </p>
              </div>
              <div
                role="progressbar"
                aria-label={item.title}
                aria-valuemin={0}
                aria-valuemax={item.target}
                aria-valuenow={Math.min(item.current, item.target)}
                className="h-1.5 overflow-hidden rounded-full bg-surface-3"
              >
                <span
                  className={cn("block h-full origin-left rounded-full", item.complete ? TIER_TONE[item.tier].bar : "bg-primary")}
                  style={{ transform: `scaleX(${pct / 100})` }}
                />
              </div>
            </div>
            {!item.complete && <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
          </li>
        );
      })}
    </ul>
  );
}

/** Feed de logros (inicio del grupo, destacados de un partido): quién, qué y cuándo. */
export function AwardFeed({
  awards,
  players,
  playerHref,
  timeZone,
  showDate = true,
  label,
}: {
  awards: Award[];
  players: PlayerNames;
  playerHref: (id: string) => string;
  timeZone: string;
  showDate?: boolean;
  label: string;
}) {
  return (
    <ul className="list-group" aria-label={label}>
      {awards.map((award) => {
        const player = players[award.playerId];
        const name = player?.nickname ?? "Jugador";
        return (
          <li key={award.id}>
            <Link href={playerHref(award.playerId)} transitionTypes={["nav-forward"]} className={ROW_LINK}>
              <AwardBadge icon={award.icon} tier={award.tier} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">
                  {name} <span className={cn("font-medium", TIER_TONE[award.tier].text)}>· {award.title}</span>
                  <span className="sr-only">, {TIER_LABELS[award.tier]}</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {award.description}
                  {showDate && <> · {formatMatchDate(award.earnedAt, timeZone)}</>}
                </span>
              </span>
              <UserAvatar name={name} src={player?.avatarUrl} size="sm" />
              <LinkPending />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Goleador y MVP de cada mes cerrado. */
export function MonthAwardsList({
  months,
  players,
  playerHref,
}: {
  months: MonthAwards[];
  players: PlayerNames;
  playerHref: (id: string) => string;
}) {
  return (
    <ul className="space-y-3" aria-label="Premios del mes">
      {months.map((month) => (
        <li key={month.key} className="list-group">
          <div className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-2">
            <p className="font-display text-lg leading-none font-extrabold tracking-wide uppercase">{month.label}</p>
            <p className="text-xs text-muted-foreground tabular">
              {month.matches} {month.matches === 1 ? "partido" : "partidos"}
            </p>
          </div>
          <MonthRow title="Goleador del mes" icon="Crown" winners={month.scorers} unit={(n) => (n === 1 ? "gol" : "goles")} players={players} playerHref={playerHref} />
          <MonthRow title="MVP del mes" icon="Star" winners={month.mvps} unit={(n) => (n === 1 ? "vez MVP" : "veces MVP")} players={players} playerHref={playerHref} />
        </li>
      ))}
    </ul>
  );
}

function MonthRow({
  title,
  icon,
  winners,
  unit,
  players,
  playerHref,
}: {
  title: string;
  icon: "Crown" | "Star";
  winners: MonthAwards["scorers"];
  unit: (n: number) => string;
  players: PlayerNames;
  playerHref: (id: string) => string;
}) {
  if (winners.length === 0) {
    return (
      <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">
        <AwardBadge icon={icon} tier="gold" size="sm" locked />
        <span className="min-w-0 flex-1">
          <span className="block text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{title}</span>
          <span className="block text-sm text-muted-foreground">Desierto</span>
        </span>
      </div>
    );
  }
  return (
    <>
      {winners.map((w) => {
        const name = players[w.playerId]?.nickname ?? "Jugador";
        return (
          <Link key={`${title}-${w.playerId}`} href={playerHref(w.playerId)} transitionTypes={["nav-forward"]} className={ROW_LINK}>
            <AwardBadge icon={icon} tier="gold" size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block text-2xs font-semibold tracking-[0.12em] text-gold uppercase">
                {title}
                {winners.length > 1 && " · compartido"}
              </span>
              <span className="block truncate text-[15px] font-semibold">{name}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-display text-xl leading-none font-extrabold text-gold tabular">{w.value}</span>
              <span className="block text-2xs text-muted-foreground">{unit(w.value)}</span>
            </span>
            <LinkPending />
          </Link>
        );
      })}
    </>
  );
}

