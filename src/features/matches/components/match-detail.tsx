import { Clock, MapPin, Star, Users } from "lucide-react";
import type { ReactNode } from "react";
import { RatingPill } from "@/components/shared/player-card";
import { PositionBadge } from "@/components/shared/position-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { dateChipParts, relativeDayLabel } from "@/domain/matches/datetime";
import { type Side, summarizeEvents } from "@/domain/matches/result";
import { formatLabel, needsResult, squadSize } from "@/domain/matches/status";
import { teamStrength } from "@/domain/matches/teams";
import { cn } from "@/lib/utils";
import type { MatchDetail, MatchParticipant } from "../queries";
import { Scoreline } from "./match-card";
import { MatchStatusBadge } from "./match-status-badge";

export const TEAM_STYLES: Record<Side, { text: string; bar: string; soft: string; dot: string }> = {
  a: { text: "text-team-a", bar: "bg-team-a", soft: "bg-team-a/10 ring-team-a/25", dot: "bg-team-a" },
  b: { text: "text-team-b", bar: "bg-team-b", soft: "bg-team-b/10 ring-team-b/25", dot: "bg-team-b" },
};

const formatAvg = (value: number | null) => (value === null ? "—" : value.toFixed(1).replace(".", ","));

/** Banda superior del detalle: estado, día, hora, cancha y formato (o el marcador si se jugó). */
export function MatchHero({
  match,
  timeZone,
  today,
  nowMs,
}: {
  match: MatchDetail;
  timeZone: string;
  today: string;
  nowMs: number;
}) {
  const parts = dateChipParts(match.scheduledAt, timeZone);
  const relative = relativeDayLabel(parts.date, today);
  const [, month, day] = parts.date.split("-");
  const confirmed = match.participants.filter((p) => p.status === "confirmed").length;
  const reserve = match.participants.filter((p) => p.status === "reserve").length;
  const capacity = squadSize(match.playersPerTeam);
  const finished = match.status === "finished";

  return (
    <section
      aria-labelledby="page-title"
      className="relative -mx-4 -mt-6 overflow-hidden border-b border-hairline bg-[radial-gradient(120%_90%_at_0%_0%,oklch(0.66_0.19_256/14%),transparent_60%)] px-4 pt-5 pb-5 lg:mx-0 lg:mt-0 lg:rounded-2xl lg:border-0 lg:panel lg:p-6"
    >
      <div className="flex flex-wrap items-center gap-2">
        <MatchStatusBadge status={match.status} pendingResult={needsResult(match.status, match.scheduledAt, nowMs)} size="md" />
        {relative && !finished && (
          <Badge tone="primary" size="md">
            {relative}
          </Badge>
        )}
      </div>
      <h1 id="page-title" className="mt-2 font-display text-display-lg font-extrabold tracking-wide uppercase sm:text-4xl">
        {parts.weekday} {day}/{month}
      </h1>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-4" aria-hidden="true" />
          <span className="tabular">{parts.time} h</span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{match.venue ?? "Cancha a definir"}</span>
        </span>
      </p>

      {finished ? (
        <Scoreline
          size="lg"
          className="mt-4"
          teams={{ a: { name: match.teams.a.name, score: match.teams.a.score }, b: { name: match.teams.b.name, score: match.teams.b.score } }}
        />
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="neutral" size="md" className="font-display text-sm font-bold tracking-wide">
            {formatLabel(match.playersPerTeam)}
          </Badge>
          <Badge tone={confirmed >= capacity ? "success" : "neutral"} size="md" className="tabular">
            <Users aria-hidden="true" />
            {confirmed}/{capacity} titulares
          </Badge>
          {reserve > 0 && (
            <Badge tone="neutral" size="md" className="tabular">
              +{reserve} {reserve === 1 ? "suplente" : "suplentes"}
            </Badge>
          )}
        </div>
      )}
    </section>
  );
}

function ParticipantRow({ player, index }: { player: MatchParticipant; index: number }) {
  return (
    <li className="flex min-h-12 items-center gap-3 px-4 py-2">
      <span className="w-5 text-right text-xs text-muted-foreground tabular">{index + 1}</span>
      <UserAvatar name={player.nickname} src={player.avatarUrl} size="sm" />
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{player.nickname}</span>
      {player.positions.primary && <PositionBadge position={player.positions.primary} size="sm" />}
      {player.side && (
        <span className={cn("size-2.5 shrink-0 rounded-full", TEAM_STYLES[player.side].dot)}>
          <span className="sr-only">{player.side === "a" ? "Equipo azul" : "Equipo rojo"}</span>
        </span>
      )}
    </li>
  );
}

/** Convocados en orden, con los suplentes aparte. */
export function ParticipantList({ participants }: { participants: MatchParticipant[] }) {
  const confirmed = participants.filter((p) => p.status === "confirmed");
  const reserve = participants.filter((p) => p.status === "reserve");
  return (
    <div className="space-y-3">
      <ul className="list-group" aria-label="Titulares">
        {confirmed.map((player, index) => (
          <ParticipantRow key={player.id} player={player} index={index} />
        ))}
      </ul>
      {reserve.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Suplentes</p>
          <ul className="list-group" aria-label="Suplentes">
            {reserve.map((player, index) => (
              <ParticipantRow key={player.id} player={player} index={index} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Las dos columnas de equipo (azul y rojo) con sus integrantes y nivel. */
export function TeamColumns({
  match,
  mvpId,
  ratings,
}: {
  match: MatchDetail;
  mvpId?: string | null;
  /** Valoración visible por jugador (motor); si falta, el nivel inicial. */
  ratings?: Record<string, number>;
}) {
  const byId = new Map(match.participants.map((p) => [p.id, p]));
  return (
    <div className="grid grid-cols-2 gap-2 lg:gap-3">
      {(["a", "b"] as const).map((side) => {
        const team = match.teams[side];
        const members = team.memberIds.flatMap((id) => {
          const player = byId.get(id);
          return player ? [player] : [];
        });
        const strength = teamStrength(members.map((m) => ratings?.[m.id] ?? m.baseRating));
        return (
          <section key={side} aria-label={`Equipo ${team.name}`} className="panel relative overflow-hidden rounded-xl">
            <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-1", TEAM_STYLES[side].bar)} />
            <header className="flex items-baseline justify-between gap-2 px-3 pt-3 pb-2">
              <h3 className={cn("truncate font-display text-lg leading-none font-extrabold tracking-wide uppercase", TEAM_STYLES[side].text)}>
                {team.name}
              </h3>
              <span className="shrink-0 text-xs text-muted-foreground tabular">
                {members.length}
                <span className="sr-only"> jugadores, nivel promedio</span>
                <span aria-hidden="true"> · ø</span> {formatAvg(strength.avg)}
              </span>
            </header>
            <ul className="divide-y divide-hairline">
              {members.map((player) => (
                <li key={player.id} className="flex min-h-10 items-center gap-2 px-3 py-1.5">
                  <UserAvatar name={player.nickname} src={player.avatarUrl} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{player.nickname}</span>
                  {mvpId === player.id && (
                    <Star className="size-4 shrink-0 fill-current text-gold" aria-label="MVP" />
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Tally({ title, items }: { title: string; items: ReactNode[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{title}</p>
      <ul className="space-y-0.5 text-sm">{items}</ul>
    </div>
  );
}

/** Detalle del resultado: goleadores, asistencias, goles en contra, MVP y notas. */
export function ResultSummary({ match, ratings }: { match: MatchDetail; ratings?: Record<string, number> }) {
  const names = new Map(match.participants.map((p) => [p.id, p.nickname]));
  const name = (id: string | null) => (id ? (names.get(id) ?? "—") : "sin autor");
  const scoreA = match.teams.a.score ?? 0;
  const scoreB = match.teams.b.score ?? 0;
  const summary = summarizeEvents(scoreA, scoreB, match.events, (id) => names.get(id) ?? id);
  const mvp = match.mvp ? match.participants.find((p) => p.id === match.mvp?.playerId) : undefined;

  return (
    <div className="panel space-y-4 rounded-xl p-4">
      <div className="grid grid-cols-2 gap-4">
        {(["a", "b"] as const).map((side) => {
          const s = summary[side];
          const goals: ReactNode[] = [
            ...s.scorers.map((t) => (
              <li key={`g-${t.playerId}`} className="flex items-baseline justify-between gap-2">
                <span className="truncate">{name(t.playerId)}</span>
                {t.count > 1 && <span className="shrink-0 text-muted-foreground tabular">×{t.count}</span>}
              </li>
            )),
            ...s.ownGoals.map((og, i) => (
              <li key={`og-${i}`} className="truncate text-muted-foreground">
                En contra ({name(og.playerId)})
              </li>
            )),
          ];
          if (s.unassigned > 0) {
            goals.push(
              <li key="unassigned" className="text-muted-foreground">
                {s.unassigned} sin autor
              </li>,
            );
          }
          const assists = s.assisters.map((t) => (
            <li key={`a-${t.playerId}`} className="flex items-baseline justify-between gap-2">
              <span className="truncate">{name(t.playerId)}</span>
              {t.count > 1 && <span className="shrink-0 text-muted-foreground tabular">×{t.count}</span>}
            </li>
          ));
          return (
            <div key={side} className="min-w-0 space-y-3">
              <p className={cn("flex items-center gap-1.5 text-sm font-semibold", TEAM_STYLES[side].text)}>
                <span aria-hidden="true" className={cn("size-2 rounded-full", TEAM_STYLES[side].dot)} />
                <span className="truncate">{match.teams[side].name}</span>
              </p>
              {goals.length === 0 && assists.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin goles</p>
              ) : (
                <>
                  <Tally title="Goles" items={goals} />
                  <Tally title="Asistencias" items={assists} />
                </>
              )}
            </div>
          );
        })}
      </div>

      {mvp && (
        <div className="flex items-center gap-3 rounded-xl bg-gold/10 p-3 ring-1 ring-gold/25 ring-inset">
          <Star className="size-5 shrink-0 fill-current text-gold" aria-hidden="true" />
          <UserAvatar name={mvp.nickname} src={mvp.avatarUrl} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block text-2xs font-semibold tracking-[0.12em] text-gold uppercase">
              {match.mvp?.source === "votes" ? "MVP por votos" : "Destacado"}
            </span>
            <span className="block truncate text-[15px] font-semibold">{mvp.nickname}</span>
          </span>
          <RatingPill rating={ratings?.[mvp.id] ?? mvp.baseRating} size="sm" />
        </div>
      )}

      {match.notes && <p className="text-sm whitespace-pre-line text-muted-foreground">{match.notes}</p>}
    </div>
  );
}
