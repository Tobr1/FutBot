"use client";

import { AlertTriangle, Eraser, Loader2, Shuffle, Sparkles } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { RatingPill } from "@/components/shared/player-card";
import { PositionBadge } from "@/components/shared/position-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Side } from "@/domain/matches/result";
import {
  type Assignment,
  balanceGapPercent,
  balanceLabel,
  balanceShare,
  cycleSide,
  DEFAULT_TEAM_NAMES,
  snakeDraft,
  TEAM_NAME_MAX,
  teamsSaveIssue,
  teamStrength,
} from "@/domain/matches/teams";
import type { Position } from "@/domain/players/positions";
import { cn } from "@/lib/utils";
import { setTeamsAction } from "../actions";

export interface TeamBuilderPlayer {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  /** Nivel usado para equilibrar (por ahora, el nivel inicial). */
  rating: number;
  position: Position | null;
}

const SIDE_STYLE: Record<Side, { text: string; bar: string; chip: string; ring: string }> = {
  a: { text: "text-team-a", bar: "bg-team-a", chip: "bg-team-a/12 ring-team-a/30", ring: "ring-team-a/40" },
  b: { text: "text-team-b", bar: "bg-team-b", chip: "bg-team-b/12 ring-team-b/30", ring: "ring-team-b/40" },
};

const formatNumber = (value: number | null) => (value === null ? "—" : value.toFixed(1).replace(".", ","));

const BALANCE_TEXT = { parejo: "Parejo", leve: "Leve diferencia", desparejo: "Desparejo" } as const;

/**
 * Armado manual de equipos, pensado para el pulgar: los jugadores sin
 * equipo se mandan a Azul o Rojo con un toque, y tocar a alguien de un
 * equipo lo pasa al siguiente (Azul → Rojo → sin equipo). Arriba, la
 * fuerza de cada equipo y una barra de equilibrio por suma de niveles.
 */
export function TeamBuilder({
  groupId,
  matchId,
  players,
  initial,
  initialNames,
  finished,
}: {
  groupId: string;
  matchId: string;
  players: TeamBuilderPlayer[];
  initial: Record<string, Side>;
  initialNames: Record<Side, string>;
  /** Partido jugado: guardar es una corrección (se descartan eventos incoherentes). */
  finished: boolean;
}) {
  const [assignment, setAssignment] = useState<Record<string, Assignment>>(() =>
    Object.fromEntries(players.map((p) => [p.id, initial[p.id] ?? null])),
  );
  const [names, setNames] = useState(initialNames);
  const [isPending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const result: Record<"a" | "b" | "pool", TeamBuilderPlayer[]> = { a: [], b: [], pool: [] };
    for (const player of players) result[assignment[player.id] ?? "pool"].push(player);
    return result;
  }, [players, assignment]);

  const strength = { a: teamStrength(groups.a.map((p) => p.rating)), b: teamStrength(groups.b.map((p) => p.rating)) };
  const share = balanceShare(strength.a, strength.b);
  const gap = balanceGapPercent(strength.a, strength.b);
  const issue = teamsSaveIssue(groups.a.length, groups.b.length);
  const anyAssigned = groups.a.length + groups.b.length > 0;

  const move = (id: string, side: Assignment) => setAssignment((current) => ({ ...current, [id]: side }));

  function snake() {
    const { a, b } = snakeDraft(players.map((p) => ({ id: p.id, rating: p.rating, nickname: p.nickname })));
    setAssignment(Object.fromEntries([...a.map((id) => [id, "a"]), ...b.map((id) => [id, "b"])]));
  }

  function save() {
    if (issue || isPending) return;
    startTransition(async () => {
      const result = await setTeamsAction({
        groupId,
        matchId,
        teamA: groups.a.map((p) => p.id),
        teamB: groups.b.map((p) => p.id),
        nameA: names.a,
        nameB: names.b,
      });
      if (!result.ok) toast.error(result.message);
    });
  }

  return (
    <div className="space-y-5">
      {/* Equilibrio: queda a la vista mientras se reparte. */}
      <div className="sticky top-[calc(3.5rem+var(--safe-top))] z-20 -mx-4 border-b border-hairline bg-background/92 px-4 py-3 backdrop-blur-md lg:static lg:mx-0 lg:rounded-xl lg:border-0 lg:panel lg:p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {(["a", "b"] as const).map((side) => (
            <div key={side} className={cn("min-w-0", side === "b" && "text-right")}>
              <p className={cn("truncate font-display text-lg leading-none font-extrabold tracking-wide uppercase", SIDE_STYLE[side].text)}>
                {names[side] || DEFAULT_TEAM_NAMES[side]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground tabular">
                {strength[side].count} jug. · ø {formatNumber(strength[side].avg)} · Σ {formatNumber(strength[side].sum)}
              </p>
            </div>
          ))}
        </div>
        <div
          className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-3"
          role="meter"
          aria-label="Equilibrio entre equipos"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(share * 100)}
          aria-valuetext={anyAssigned ? `${BALANCE_TEXT[balanceLabel(gap)]}, ${gap}% de diferencia` : "Sin jugadores asignados"}
        >
          {anyAssigned && (
            <>
              <span className="h-full bg-team-a transition-[width] duration-200" style={{ width: `${share * 100}%` }} />
              <span className="h-full flex-1 bg-team-b" />
            </>
          )}
        </div>
        <p className="mt-1.5 text-center text-xs text-muted-foreground" aria-hidden="true">
          {anyAssigned ? (
            <>
              <span
                className={cn(
                  "font-semibold",
                  balanceLabel(gap) === "parejo" ? "text-success" : balanceLabel(gap) === "leve" ? "text-warning" : "text-destructive",
                )}
              >
                {BALANCE_TEXT[balanceLabel(gap)]}
              </span>{" "}
              · {gap}% de diferencia
            </>
          ) : (
            "Repartí a los jugadores para ver el equilibrio"
          )}
        </p>
      </div>

      {finished && (
        <p className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-sm text-warning ring-1 ring-warning/25 ring-inset">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          El partido ya tiene resultado: si cambiás a alguien de equipo, se descartan sus goles y asistencias. La corrección queda registrada.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={snake} disabled={players.length < 2}>
          <Shuffle aria-hidden="true" />
          Mezclar por nivel
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAssignment({})} disabled={!anyAssigned}>
          <Eraser aria-hidden="true" />
          Vaciar
        </Button>
        {/* Lugar reservado para el generador automático de equipos parejos (src/domain/balancer). */}
        <Button type="button" variant="outline" size="sm" disabled className="gap-2">
          <Sparkles aria-hidden="true" />
          Generar parejos
          <Badge tone="primary" size="sm">
            Muy pronto
          </Badge>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:gap-3">
        {(["a", "b"] as const).map((side) => (
          <section key={side} aria-label={`Equipo ${names[side] || DEFAULT_TEAM_NAMES[side]}`} className="panel relative min-w-0 rounded-xl">
            <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-1 rounded-t-xl", SIDE_STYLE[side].bar)} />
            <div className="flex items-center gap-1 px-2 pt-2.5">
              <input
                value={names[side]}
                onChange={(e) => setNames((current) => ({ ...current, [side]: e.target.value }))}
                maxLength={TEAM_NAME_MAX}
                placeholder={DEFAULT_TEAM_NAMES[side]}
                aria-label={`Nombre del equipo ${side === "a" ? "azul" : "rojo"}`}
                autoCapitalize="words"
                autoComplete="off"
                enterKeyHint="done"
                className={cn(
                  "h-9 min-w-0 flex-1 rounded-md bg-transparent px-1.5 font-display text-lg font-extrabold tracking-wide uppercase outline-none pointer-coarse:h-11",
                  "focus-visible:bg-surface-3 focus-visible:ring-1 focus-visible:ring-ring",
                  SIDE_STYLE[side].text,
                )}
              />
              <span className="shrink-0 pr-1 text-xs text-muted-foreground tabular">{groups[side].length}</span>
            </div>
            {groups[side].length === 0 ? (
              <p className="px-3 pt-1 pb-4 text-xs text-muted-foreground">Sin jugadores todavía.</p>
            ) : (
              <ul className="space-y-1 p-2">
                {groups[side].map((player) => (
                  <li key={player.id}>
                    <button
                      type="button"
                      onClick={() => move(player.id, cycleSide(side))}
                      aria-label={`${player.nickname}: pasar a ${side === "a" ? names.b || DEFAULT_TEAM_NAMES.b : "sin equipo"}`}
                      className={cn(
                        "pressable flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ring-1 ring-inset",
                        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                        SIDE_STYLE[side].chip,
                      )}
                    >
                      <UserAvatar name={player.nickname} src={player.avatarUrl} size="xs" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{player.nickname}</span>
                      <span className="shrink-0 font-display text-sm font-bold text-muted-foreground tabular">
                        {formatNumber(player.rating)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <section aria-labelledby="sin-equipo" className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="sin-equipo" className="text-base font-semibold tracking-tight">
            Sin equipo <span className="text-xs font-normal text-muted-foreground tabular">{groups.pool.length}</span>
          </h2>
          <p className="text-xs text-muted-foreground">Tocá un jugador de un equipo para cambiarlo.</p>
        </div>
        {groups.pool.length === 0 ? (
          <p className="panel rounded-xl p-4 text-sm text-muted-foreground">Todos los titulares tienen equipo.</p>
        ) : (
          <ul className="list-group" aria-label="Jugadores sin equipo">
            {groups.pool.map((player) => (
              <li key={player.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <UserAvatar name={player.nickname} src={player.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{player.nickname}</span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    {player.position && <PositionBadge position={player.position} size="sm" />}
                    <RatingPill rating={player.rating} size="sm" className="h-5 min-w-7 text-xs" />
                  </span>
                </span>
                {(["a", "b"] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => move(player.id, side)}
                    aria-label={`${player.nickname} a ${names[side] || DEFAULT_TEAM_NAMES[side]}`}
                    className={cn(
                      "pressable grid size-11 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold uppercase ring-1 ring-inset",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      SIDE_STYLE[side].chip,
                      SIDE_STYLE[side].text,
                    )}
                  >
                    {(names[side] || DEFAULT_TEAM_NAMES[side]).slice(0, 1)}
                  </button>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>

      <StickyActionBar className="space-y-2">
        {issue && anyAssigned && <p className="text-center text-xs text-muted-foreground lg:text-left">{issue}</p>}
        <Button
          type="button"
          size="lg"
          className="w-full lg:w-auto"
          onClick={save}
          disabled={Boolean(issue) || isPending}
          aria-busy={isPending || undefined}
        >
          {isPending && <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />}
          {isPending ? "Guardando…" : "Guardar equipos"}
        </Button>
      </StickyActionBar>
    </div>
  );
}
