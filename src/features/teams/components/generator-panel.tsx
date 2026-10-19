"use client";

import { AlertTriangle, Check, ChevronLeft, ChevronRight, Pin, RefreshCw, X } from "lucide-react";
import * as m from "motion/react-m";
import { type ReactNode, useId, useMemo } from "react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  type BalanceResult,
  type BalancerPlayer,
  type Constraints,
  explainSplit,
  formatDecimal,
  type Side,
  type TeamSplit,
} from "@/domain/balancer";
import { NEW_PLAYER_SIGMA, shareOf } from "@/domain/matches/team-generator";
import { balanceLabel } from "@/domain/matches/teams";
import { winProbability } from "@/domain/rating";
import { cn } from "@/lib/utils";
import { WinProbabilityBar } from "./win-probability";

export interface GeneratorPlayer {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

const SIDE_TEXT: Record<Side, string> = { a: "text-team-a", b: "text-team-b" };
const SIDE_BAR: Record<Side, string> = { a: "bg-team-a", b: "bg-team-b" };

export const BALANCE_TEXT = { parejo: "Parejo", leve: "Leve diferencia", desparejo: "Desparejo" } as const;
export const BALANCE_TONE = { parejo: "text-success", leve: "text-warning", desparejo: "text-destructive" } as const;

const count = new Intl.NumberFormat("es-AR");

/** Distancia mínima del gesto (px) o velocidad (px/s) para pasar de alternativa. */
const SWIPE = { offset: 56, velocity: 420 };

/**
 * Resultado de "Generar parejos": las mejores alternativas distintas, de a una,
 * con las listas de cada equipo, el equilibrio, el pronóstico y la explicación.
 * Se pasa de una a otra con las flechas, "Otra alternativa" o deslizando.
 */
export function GeneratorPanel({
  result,
  index,
  onIndexChange,
  onApply,
  players,
  balancerPlayers,
  constraints,
  teamNames,
  pins = {},
  appliedIndex,
  stale = false,
  onRegenerate,
  onClose,
}: {
  result: BalanceResult;
  index: number;
  onIndexChange: (index: number) => void;
  onApply: (split: TeamSplit) => void;
  players: Readonly<Record<string, GeneratorPlayer>>;
  balancerPlayers: readonly BalancerPlayer[];
  constraints: Constraints;
  teamNames: Record<Side, string>;
  pins?: Readonly<Record<string, Side>>;
  /** Alternativa que coincide con los equipos de abajo (null si ninguna). */
  appliedIndex: number | null;
  /** Cambiaron los fijados o las reglas desde que se generó. */
  stale?: boolean;
  onRegenerate?: () => void;
  onClose?: () => void;
}) {
  const titleId = useId();
  const total = result.alternatives.length;
  const current = Math.min(Math.max(index, 0), total - 1);
  const split = result.alternatives[current];
  const skillOf = useMemo(() => new Map(balancerPlayers.map((p) => [p.id, p.skill])), [balancerPlayers]);

  const explanation = useMemo(
    () => explainSplit(split, balancerPlayers, constraints, { teamNames, provisionalSigma: NEW_PLAYER_SIGMA }),
    [split, balancerPlayers, constraints, teamNames],
  );
  const probability = useMemo(
    () =>
      winProbability(
        split.a.map((id) => skillOf.get(id) ?? Number.NaN),
        split.b.map((id) => skillOf.get(id) ?? Number.NaN),
      ),
    [split, skillOf],
  );

  const go = (delta: number) => onIndexChange((current + delta + total) % total);
  const gap = Math.round(split.metrics.levelDiffPct);
  const label = balanceLabel(gap);
  const share = shareOf(split.metrics);
  const applied = appliedIndex === current;

  return (
    <section aria-labelledby={titleId} data-generator-panel="" className="panel-raised relative overflow-hidden rounded-xl">
      <div className="flex items-center gap-1 border-b border-hairline py-1 pr-1 pl-4">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-2xs font-semibold tracking-[0.12em] text-primary uppercase">
            Equipos parejos
          </h2>
          <p className="font-display text-lg leading-tight font-extrabold tracking-wide uppercase" aria-live="polite">
            Opción {current + 1} <span className="text-muted-foreground">de {total}</span>
          </p>
        </div>
        {total > 1 && (
          <>
            <Button type="button" variant="ghost" size="icon" onClick={() => go(-1)} aria-label="Alternativa anterior">
              <ChevronLeft className="size-5" aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => go(1)} aria-label="Alternativa siguiente">
              <ChevronRight className="size-5" aria-hidden="true" />
            </Button>
          </>
        )}
        {onClose && (
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar alternativas">
            <X className="size-5" aria-hidden="true" />
          </Button>
        )}
      </div>

      {stale && (
        <div className="flex items-center gap-2 border-b border-hairline bg-warning/8 px-4 py-2 text-xs text-warning">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">Cambiaron los fijados o las reglas.</span>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 font-semibold underline-offset-4 hover:underline"
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Generar de nuevo
            </button>
          )}
        </div>
      )}

      <m.div
        drag={total > 1 ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        dragSnapToOrigin
        onDragEnd={(_event, info) => {
          if (info.offset.x < -SWIPE.offset || info.velocity.x < -SWIPE.velocity) go(1);
          else if (info.offset.x > SWIPE.offset || info.velocity.x > SWIPE.velocity) go(-1);
        }}
        className="touch-pan-y"
      >
        <div key={current} className="animate-rise space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            {(["a", "b"] as const).map((side) => (
              <TeamList
                key={side}
                side={side}
                name={teamNames[side]}
                average={side === "a" ? split.metrics.avgA : split.metrics.avgB}
                ids={split[side]}
                players={players}
                skillOf={skillOf}
                pins={pins}
              />
            ))}
          </div>

          <div>
            <div
              className="flex h-2 overflow-hidden rounded-full bg-surface-3"
              role="meter"
              aria-label="Equilibrio entre equipos"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(share * 100)}
              aria-valuetext={`${BALANCE_TEXT[label]}, ${formatDecimal(split.metrics.levelDiffPct)} % de diferencia`}
            >
              <span className="h-full bg-team-a" style={{ width: `${share * 100}%` }} />
              <span className="h-full flex-1 bg-team-b" />
            </div>
            <p className="mt-1.5 text-center text-xs text-muted-foreground" aria-hidden="true">
              <span className={cn("font-semibold", BALANCE_TONE[label])}>{BALANCE_TEXT[label]}</span> · diferencia de nivel{" "}
              {formatDecimal(split.metrics.levelDiffPct)} %
            </p>
          </div>

          <WinProbabilityBar probability={probability} names={teamNames} size="sm" />

          <ul className="space-y-1.5 text-sm" aria-label="Por qué este armado">
            {explanation.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" />
                <span className="min-w-0 text-muted-foreground">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </m.div>

      <div className="space-y-2 border-t border-hairline p-4 pt-3">
        <div className={cn("grid gap-2", total > 1 && "grid-cols-[minmax(0,1fr)_auto]")}>
          <Button type="button" size="lg" className="w-full px-4" onClick={() => onApply(split)} disabled={applied}>
            {applied ? <Check aria-hidden="true" /> : null}
            {applied ? "En uso" : "Usar estos equipos"}
          </Button>
          {total > 1 && (
            <Button type="button" variant="secondary" size="lg" onClick={() => go(1)} className="px-4">
              <RefreshCw aria-hidden="true" />
              Otra<span className="max-[24.9rem]:sr-only"> alternativa</span>
            </Button>
          )}
        </div>
        <MethodNote result={result} />
      </div>
    </section>
  );
}

function TeamList({
  side,
  name,
  average,
  ids,
  players,
  skillOf,
  pins,
}: {
  side: Side;
  name: string;
  average: number;
  ids: readonly string[];
  players: Readonly<Record<string, GeneratorPlayer>>;
  skillOf: Map<string, number>;
  pins: Readonly<Record<string, Side>>;
}) {
  return (
    <div className="min-w-0">
      <span aria-hidden="true" className={cn("block h-1 rounded-full", SIDE_BAR[side])} />
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <h3 className={cn("truncate font-display text-base leading-none font-extrabold tracking-wide uppercase", SIDE_TEXT[side])}>
          {name}
        </h3>
        <span className="shrink-0 text-xs text-muted-foreground tabular">
          <span className="sr-only">Nivel promedio </span>ø {formatDecimal(average)}
        </span>
      </div>
      <ul className="mt-2 space-y-1" aria-label={`Jugadores de ${name}`}>
        {ids.map((id) => {
          const player = players[id];
          const nickname = player?.nickname ?? "—";
          return (
            <li key={id} className="flex min-h-8 items-center gap-1.5 text-sm">
              <UserAvatar name={nickname} src={player?.avatarUrl} size="xs" />
              <span className="min-w-0 flex-1 truncate font-medium">{nickname}</span>
              {pins[id] && <Pin className="size-3.5 shrink-0 text-primary" aria-label="Fijado" />}
              <span className="shrink-0 font-display text-sm font-bold text-muted-foreground tabular">
                {formatDecimal(skillOf.get(id) ?? 0)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Qué búsqueda corrió, en voz baja. */
function MethodNote({ result }: { result: BalanceResult }) {
  return (
    <p className="text-center text-2xs text-muted-foreground lg:text-left">
      {result.method === "exhaustive"
        ? `Búsqueda exhaustiva: el mejor armado posible entre ${count.format(result.evaluated)} combinaciones.`
        : `Búsqueda heurística (son muchos jugadores): ${count.format(result.evaluated)} combinaciones revisadas.`}
    </p>
  );
}

/**
 * Cuando no se puede generar: restricciones imposibles, contradicciones entre
 * reglas y fijados o pocos jugadores. Dice qué pasa y cómo arreglarlo.
 */
export function GeneratorIssues({
  messages,
  hint,
  actions,
  onClose,
}: {
  messages: readonly string[];
  hint: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
}) {
  const titleId = useId();
  return (
    <section role="alert" aria-labelledby={titleId} className="rounded-xl bg-destructive/10 p-4 ring-1 ring-destructive/30 ring-inset">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-2">
          <h2 id={titleId} className="text-[15px] font-semibold text-destructive">
            No se pueden armar equipos así
          </h2>
          <ul className="space-y-1 text-sm text-foreground">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        {onClose && (
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar aviso" className="-mt-2 -mr-2">
            <X className="size-5" aria-hidden="true" />
          </Button>
        )}
      </div>
      {actions && <div className="mt-3 flex flex-wrap gap-2 pl-7.5">{actions}</div>}
    </section>
  );
}
