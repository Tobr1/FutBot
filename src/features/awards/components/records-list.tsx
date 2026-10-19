import { CalendarDays, Flame, Goal, Handshake, type LucideIcon, ShieldCheck, Swords, Zap } from "lucide-react";
import Link from "next/link";
import { LinkPending } from "@/components/shared/link-pending";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { GroupRecords, MatchRecord, PlayerRecord } from "@/domain/awards";
import { formatMatchDate } from "@/domain/matches/datetime";
import type { PlayerNames } from "./award-lists";

const ROW_LINK =
  "pressable-row relative flex min-h-16 items-center gap-3 px-4 py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

const PLAYER_ICONS: Record<PlayerRecord["kind"], LucideIcon> = {
  "goals-in-match": Goal,
  "assists-in-match": Handshake,
  "win-streak": Zap,
  "unbeaten-streak": ShieldCheck,
  "attendance-streak": CalendarDays,
};

const MATCH_ICONS: Record<MatchRecord["kind"], LucideIcon> = {
  "biggest-win": Swords,
  "most-goals": Flame,
};

function RecordIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/12 text-gold ring-1 ring-gold/25 ring-inset">
      <Icon className="size-5" />
    </span>
  );
}

/** Récords del grupo: de jugadores (con su nombre) y de partidos (con el marcador). */
export function RecordsList({
  records,
  players,
  playerHref,
  matchHref,
  timeZone,
}: {
  records: GroupRecords;
  players: PlayerNames;
  playerHref: (id: string) => string;
  matchHref: (id: string) => string;
  timeZone: string;
}) {
  return (
    <ul className="list-group" aria-label="Récords">
      {records.players.map((r) => {
        const name = players[r.playerId]?.nickname ?? "Jugador";
        return (
          <li key={r.kind}>
            <Link href={playerHref(r.playerId)} transitionTypes={["nav-forward"]} className={ROW_LINK}>
              <RecordIcon icon={PLAYER_ICONS[r.kind]} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{r.title}</span>
                <span className="flex items-center gap-2">
                  <UserAvatar name={name} src={players[r.playerId]?.avatarUrl} size="xs" />
                  <span className="truncate text-[15px] font-semibold">{name}</span>
                </span>
                <span className="block truncate text-xs text-muted-foreground tabular">
                  {r.matchId ? "El " : "Hasta el "}
                  {formatMatchDate(r.at, timeZone)}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-display text-2xl leading-none font-extrabold text-gold tabular">{r.value}</span>
                <span className="block text-2xs text-muted-foreground">{r.display.replace(/^\d+\s*/, "")}</span>
              </span>
              <LinkPending />
            </Link>
          </li>
        );
      })}
      {records.matches.map((r) => (
        <li key={r.kind}>
          <Link href={matchHref(r.matchId)} transitionTypes={["nav-forward"]} className={ROW_LINK}>
            <RecordIcon icon={MATCH_ICONS[r.kind]} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{r.title}</span>
              <span className="block truncate text-[15px] font-semibold">Partido del {formatMatchDate(r.at, timeZone)}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-display text-xl leading-none font-extrabold text-gold tabular">
                {r.score.a}–{r.score.b}
              </span>
              <span className="block text-2xs text-muted-foreground tabular">
                {r.kind === "most-goals" ? `${r.score.a + r.score.b} goles` : `por ${Math.abs(r.score.a - r.score.b)}`}
              </span>
            </span>
            <LinkPending />
          </Link>
        </li>
      ))}
    </ul>
  );
}
