import { Goal, Star } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { LinkPending } from "@/components/shared/link-pending";
import { formatDecimal } from "@/domain/rating";
import { groupByMonth } from "@/domain/stats/history";
import { DateChip, Scoreline } from "@/features/matches/components/match-card";
import type { HistoryMatch } from "../queries";

/** Partidos jugados agrupados por mes: marcador, goleadores, MVP y promedio de calificaciones. */
export function HistoryList({
  matches,
  timeZone,
  matchHref,
}: {
  matches: HistoryMatch[];
  timeZone: string;
  matchHref: (id: string) => string;
}) {
  const groups = groupByMonth(matches, (m) => m.scheduledAt, timeZone);
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`mes-${group.key}`} className="space-y-2">
          <h2 id={`mes-${group.key}`} className="flex items-baseline gap-2 px-1 text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {group.label}
            <span className="font-normal tracking-normal normal-case tabular">
              · {group.items.length} {group.items.length === 1 ? "partido" : "partidos"}
            </span>
          </h2>
          <ul className="grid gap-2 lg:grid-cols-2 lg:gap-3">
            {group.items.map((match, index) => (
              <li
                key={match.id}
                className="animate-rise [animation-delay:calc(min(var(--i),8)*35ms)]"
                style={{ "--i": index } as CSSProperties}
              >
                <Link
                  href={matchHref(match.id)}
                  transitionTypes={["nav-forward"]}
                  className="panel pressable relative flex items-center gap-3 rounded-xl p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <DateChip scheduledAt={match.scheduledAt} timeZone={timeZone} />
                  <span className="min-w-0 flex-1 space-y-1">
                    <Scoreline teams={match.teams} />
                    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {match.scorers && (
                        <span className="flex min-w-0 items-center gap-1">
                          <Goal className="size-3.5 shrink-0" aria-hidden="true" />
                          <span className="sr-only">Goles: </span>
                          <span className="truncate">{match.scorers}</span>
                        </span>
                      )}
                      {match.mvp && (
                        <span className="flex min-w-0 items-center gap-1 text-gold">
                          <Star className="size-3.5 shrink-0 fill-current" aria-hidden="true" />
                          <span className="sr-only">MVP: </span>
                          <span className="truncate">{match.mvp.nickname}</span>
                        </span>
                      )}
                      {match.averageRating !== null && (
                        <span className="tabular">
                          Prom. <span className="font-semibold text-foreground">{formatDecimal(match.averageRating)}</span>
                        </span>
                      )}
                    </span>
                  </span>
                  <LinkPending />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
