import { Star } from "lucide-react";
import Link from "next/link";
import { LinkPending } from "@/components/shared/link-pending";
import { formatMatchDate } from "@/domain/matches/datetime";
import { formatDecimal } from "@/domain/rating";
import { contributionText, type MatchResult, RESULT_LABELS, resultOf } from "@/domain/stats/player-lines";
import { cn } from "@/lib/utils";
import type { RecentMatch } from "../queries";

const RESULT_CHIP: Record<MatchResult, string> = {
  win: "bg-win/15 text-win ring-win/30",
  draw: "bg-draw/15 text-draw ring-draw/30",
  loss: "bg-loss/15 text-loss ring-loss/30",
};

/** Chip V/E/D con el color de resultado y la palabra completa para lectores de pantalla. */
export function ResultChip({ result, className }: { result: MatchResult; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg font-display text-base font-extrabold ring-1 ring-inset",
        RESULT_CHIP[result],
        className,
      )}
    >
      <span aria-hidden="true">{RESULT_LABELS[result].short}</span>
      <span className="sr-only">{RESULT_LABELS[result].long}</span>
    </span>
  );
}

/** Últimos partidos de un jugador: resultado, marcador propio, aporte y calificación. */
export function RecentMatches({
  matches,
  timeZone,
  matchHref,
}: {
  matches: RecentMatch[];
  timeZone: string;
  matchHref: (id: string) => string;
}) {
  return (
    <ul className="list-group" aria-label="Últimos partidos">
      {matches.map((m) => {
        const result = resultOf(m.goalsFor, m.goalsAgainst);
        return (
          <li key={m.matchId}>
            <Link
              href={matchHref(m.matchId)}
              transitionTypes={["nav-forward"]}
              className="pressable-row relative flex min-h-14 items-center gap-3 px-4 py-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <ResultChip result={result} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-lg leading-none font-extrabold tabular">
                    {m.goalsFor}–{m.goalsAgainst}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{formatMatchDate(m.scheduledAt, timeZone)}</span>
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="tabular">{contributionText(m)}</span>
                  {m.isMvp && (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-gold">
                      <Star className="size-3 fill-current" aria-hidden="true" />
                      MVP
                    </span>
                  )}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-display text-xl leading-none font-extrabold tabular">
                  {m.performance === null ? "—" : formatDecimal(m.performance)}
                </span>
                <span className="block text-2xs text-muted-foreground">{m.performance === null ? "sin votos" : "calif."}</span>
              </span>
              <LinkPending />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
