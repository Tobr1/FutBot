import { MapPin, Star, Users } from "lucide-react";
import Link from "next/link";
import { LinkPending } from "@/components/shared/link-pending";
import { dateChipParts, relativeDayLabel } from "@/domain/matches/datetime";
import { outcome } from "@/domain/matches/result";
import { formatLabel, needsResult, squadSize } from "@/domain/matches/status";
import { cn } from "@/lib/utils";
import type { MatchListItem } from "../queries";
import { MatchStatusBadge } from "./match-status-badge";

/** Chip de fecha: día de semana (o Hoy/Mañana), número y hora. */
export function DateChip({
  scheduledAt,
  timeZone,
  today,
  muted = false,
  className,
}: {
  scheduledAt: string;
  timeZone: string;
  /** Fecha local de hoy (YYYY-MM-DD) para mostrar "Hoy"/"Mañana". */
  today?: string;
  muted?: boolean;
  className?: string;
}) {
  const parts = dateChipParts(scheduledAt, timeZone);
  const relative = today ? relativeDayLabel(parts.date, today) : null;
  const highlight = relative === "Hoy" || relative === "Mañana";
  return (
    <span
      className={cn(
        "flex w-14 shrink-0 flex-col items-center justify-center rounded-lg py-1.5 ring-1 ring-inset",
        highlight && !muted ? "bg-primary/14 text-primary ring-primary/25" : "bg-surface-3/60 ring-hairline",
        muted && "opacity-60",
        className,
      )}
    >
      <span className="text-2xs leading-4 font-semibold tracking-[0.08em] uppercase">
        {highlight ? relative : parts.weekday}
      </span>
      <span className="font-display text-2xl leading-none font-extrabold tabular">{parts.day}</span>
      <span className="text-2xs leading-4 text-muted-foreground tabular">{parts.time}</span>
    </span>
  );
}

/** Marcador "Azul 3 – 2 Rojo" con los colores de cada equipo; el ganador resaltado. */
export function Scoreline({
  teams,
  size = "md",
  className,
}: {
  teams: MatchListItem["teams"];
  size?: "md" | "lg";
  className?: string;
}) {
  const a = teams.a.score ?? 0;
  const b = teams.b.score ?? 0;
  const winner = outcome(a, b);
  const number = size === "lg" ? "text-stat-xl" : "text-stat";
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <span className="sr-only">
        {teams.a.name} {a}, {teams.b.name} {b}
      </span>
      <span aria-hidden="true" className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span className={cn("truncate text-sm font-semibold", winner === "b" && "text-muted-foreground")}>{teams.a.name}</span>
        <span className="size-2 shrink-0 rounded-full bg-team-a" />
      </span>
      <span aria-hidden="true" className={cn("shrink-0 font-display font-extrabold tabular", number)}>
        <span className={cn(winner === "b" && "text-muted-foreground")}>{a}</span>
        <span className="mx-1.5 text-muted-foreground">–</span>
        <span className={cn(winner === "a" && "text-muted-foreground")}>{b}</span>
      </span>
      <span aria-hidden="true" className="flex min-w-0 flex-1 items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-team-b" />
        <span className={cn("truncate text-sm font-semibold", winner === "a" && "text-muted-foreground")}>{teams.b.name}</span>
      </span>
    </span>
  );
}

/**
 * Tarjeta de partido para listas: fecha, cancha, formato y convocados; si
 * ya se jugó, el marcador con los colores de cada equipo y el MVP.
 */
export function MatchCard({
  href,
  match,
  timeZone,
  today,
  nowMs,
  className,
}: {
  href: string;
  match: MatchListItem;
  timeZone: string;
  today?: string;
  /** "Ahora" (ms) para marcar los partidos a los que les falta el resultado. */
  nowMs?: number;
  className?: string;
}) {
  const finished = match.status === "finished";
  const cancelled = match.status === "cancelled";
  const capacity = squadSize(match.playersPerTeam);
  const pendingResult = nowMs !== undefined && needsResult(match.status, match.scheduledAt, nowMs);

  return (
    <Link
      href={href}
      transitionTypes={["nav-forward"]}
      className={cn(
        "panel pressable relative flex items-center gap-3 rounded-xl p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <DateChip scheduledAt={match.scheduledAt} timeZone={timeZone} today={finished || cancelled ? undefined : today} muted={cancelled} />

      <span className="min-w-0 flex-1">
        {finished ? (
          <Scoreline teams={match.teams} />
        ) : (
          <span className={cn("flex items-center gap-2", cancelled && "text-muted-foreground line-through")}>
            <span className="truncate text-[15px] font-semibold">{match.venue ?? "Cancha a definir"}</span>
          </span>
        )}
        <span className="mt-1 flex min-w-0 items-center gap-x-2 text-xs text-muted-foreground">
          {finished ? (
            match.mvp ? (
              <span className="flex min-w-0 items-center gap-1 text-gold">
                <Star className="size-3.5 shrink-0 fill-current" aria-hidden="true" />
                <span className="truncate">
                  <span className="sr-only">MVP: </span>
                  {match.mvp.nickname}
                </span>
              </span>
            ) : (
              match.venue && (
                <span className="flex min-w-0 items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{match.venue}</span>
                </span>
              )
            )
          ) : (
            <>
              <span className="font-display text-sm leading-none font-bold tracking-wide text-foreground">
                {formatLabel(match.playersPerTeam)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 tabular">
                <Users className="size-3.5" aria-hidden="true" />
                <span className={cn(match.confirmed >= capacity && "text-success")}>
                  {match.confirmed}/{capacity}
                </span>
                <span className="sr-only">confirmados</span>
              </span>
              {match.reserve > 0 && <span className="tabular">+{match.reserve} sup.</span>}
            </>
          )}
        </span>
      </span>

      {!finished && <MatchStatusBadge status={match.status} pendingResult={pendingResult} className="shrink-0 self-start" />}
      <LinkPending />
    </Link>
  );
}
