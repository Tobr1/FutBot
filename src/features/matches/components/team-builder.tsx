"use client";

import { AlertTriangle, Eraser, Loader2, Pin, PinOff, Shuffle, Sparkles } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { RatingPill } from "@/components/shared/player-card";
import { PositionBadge } from "@/components/shared/position-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import {
  type BalanceResult,
  type BalancerPlayer,
  balanceTeams,
  type Constraints,
  evaluateSplit,
  formatDecimal,
  MIN_PLAYERS,
  type TeamSplit,
} from "@/domain/balancer";
import type { Side } from "@/domain/matches/result";
import {
  assignmentFromSplit,
  formatWinProbability,
  matchesSplit,
  mergeConstraints,
  pinsAfterApply,
  pinsAfterMove,
  pinsKey,
  shareOf,
  type TeamRule,
  teamForecast,
  togglePin,
} from "@/domain/matches/team-generator";
import {
  type Assignment,
  balanceLabel,
  cycleSide,
  DEFAULT_TEAM_NAMES,
  snakeDraft,
  TEAM_NAME_MAX,
  teamsSaveIssue,
  teamStrength,
} from "@/domain/matches/teams";
import type { Position } from "@/domain/players/positions";
import { BALANCE_TEXT, BALANCE_TONE, GeneratorIssues, GeneratorPanel } from "@/features/teams/components/generator-panel";
import { TeamRulesSheet } from "@/features/teams/components/team-rules";
import { cn } from "@/lib/utils";
import { setTeamsAction } from "../actions";

export interface TeamBuilderPlayer {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  /** Nivel visible: habilidad del motor o, sin datos, el nivel inicial. */
  rating: number;
  position: Position | null;
}

const SIDE_STYLE: Record<Side, { text: string; bar: string; chip: string; ring: string }> = {
  a: { text: "text-team-a", bar: "bg-team-a", chip: "bg-team-a/12 ring-team-a/30", ring: "ring-team-a/40" },
  b: { text: "text-team-b", bar: "bg-team-b", chip: "bg-team-b/12 ring-team-b/30", ring: "ring-team-b/40" },
};

const formatNumber = (value: number | null) => (value === null ? "—" : value.toFixed(1).replace(".", ","));

/** Deja pintar el estado "Generando…" antes del cálculo (síncrono, ~20 ms con 22 jugadores). */
const nextFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

type Generation =
  | { kind: "result"; result: BalanceResult; constraints: Constraints; key: string }
  | { kind: "issues"; messages: string[]; key: string };

/**
 * Armado de equipos, pensado para el pulgar. "Generar parejos" corre el
 * optimizador en el navegador con la valoración del motor, las reglas del
 * grupo y los fijados de la sesión, y muestra las mejores alternativas.
 * A mano: los jugadores sin equipo se mandan a Azul o Rojo con un toque y
 * tocar a alguien de un equipo lo pasa al siguiente (Azul → Rojo → sin
 * equipo); en modo "Fijar", el toque lo fija en su equipo. Arriba, el
 * equilibrio y el pronóstico del armado actual.
 */
export function TeamBuilder({
  groupId,
  matchId,
  players,
  balancer,
  rules,
  previousTeams,
  rulesHref,
  canEditRules,
  initial,
  initialNames,
  finished,
}: {
  groupId: string;
  matchId: string;
  players: TeamBuilderPlayer[];
  /** Los mismos jugadores con lo que necesita el optimizador (S, σ, forma, posiciones). */
  balancer: BalancerPlayer[];
  /** Reglas del grupo con los dos jugadores en este partido. */
  rules: TeamRule[];
  /** Equipos del último partido jugado (variedad). */
  previousTeams?: { a: string[]; b: string[] };
  rulesHref: string;
  canEditRules: boolean;
  initial: Record<string, Side>;
  initialNames: Record<Side, string>;
  /** Partido jugado: guardar es una corrección (se descartan eventos incoherentes). */
  finished: boolean;
}) {
  const [assignment, setAssignment] = useState<Record<string, Assignment>>(() =>
    Object.fromEntries(players.map((p) => [p.id, initial[p.id] ?? null])),
  );
  const [names, setNames] = useState(initialNames);
  const [pins, setPins] = useState<Record<string, Side>>({});
  const [pinMode, setPinMode] = useState(false);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [altIndex, setAltIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, startGenerating] = useTransition();

  const teamNames = useMemo<Record<Side, string>>(
    () => ({ a: names.a.trim() || DEFAULT_TEAM_NAMES.a, b: names.b.trim() || DEFAULT_TEAM_NAMES.b }),
    [names],
  );

  const groups = useMemo(() => {
    const result: Record<"a" | "b" | "pool", TeamBuilderPlayer[]> = { a: [], b: [], pool: [] };
    for (const player of players) result[assignment[player.id] ?? "pool"].push(player);
    return result;
  }, [players, assignment]);

  const skillById = useMemo(() => new Map(balancer.map((p) => [p.id, p.skill])), [balancer]);
  const nicknameById = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p.nickname])), [players]);
  const generatorPlayers = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, { id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }])),
    [players],
  );

  // Métricas del armado actual con la misma función que usa el optimizador.
  const evaluation = useMemo(() => {
    if (!groups.a.length || !groups.b.length) return null;
    const a = groups.a.map((p) => p.id);
    const b = groups.b.map((p) => p.id);
    const { metrics } = evaluateSplit(balancer, a, b, { previousTeams });
    return { metrics, forecast: teamForecast({ a, b }, (id) => skillById.get(id)) };
  }, [groups, balancer, previousTeams, skillById]);

  const strength = { a: teamStrength(groups.a.map((p) => p.rating)), b: teamStrength(groups.b.map((p) => p.rating)) };
  const issue = teamsSaveIssue(groups.a.length, groups.b.length);
  const anyAssigned = groups.a.length + groups.b.length > 0;
  const gap = evaluation ? Math.round(evaluation.metrics.levelDiffPct) : 0;
  const share = evaluation ? shareOf(evaluation.metrics) : groups.a.length ? 1 : groups.b.length ? 0 : 0.5;
  const pinnedCount = Object.keys(pins).length;
  const canGenerate = players.length >= MIN_PLAYERS;
  const generationKey = `${pinsKey(pins)}#${rules
    .map((r) => `${r.id}:${r.kind}`)
    .sort()
    .join(",")}`;

  const alternatives = generation?.kind === "result" ? generation.result.alternatives : [];
  const appliedIndex = alternatives.findIndex((alt) => matchesSplit(assignment, alt));

  function move(id: string, side: Assignment) {
    setAssignment((current) => ({ ...current, [id]: side }));
    setPins((current) => pinsAfterMove(current, id, side));
  }

  function tapTeamPlayer(id: string, side: Side) {
    if (pinMode) setPins((current) => togglePin(current, id, side));
    else move(id, cycleSide(side));
  }

  function snake() {
    const { a, b } = snakeDraft(players.map((p) => ({ id: p.id, rating: p.rating, nickname: p.nickname })));
    setAssignment(Object.fromEntries([...a.map((id) => [id, "a"]), ...b.map((id) => [id, "b"])]));
    setPins({});
  }

  function clearAll() {
    setAssignment({});
    setPins({});
  }

  function generate() {
    if (!canGenerate || isGenerating) return;
    const key = generationKey;
    const merged = mergeConstraints({
      rules,
      pins,
      playerIds: players.map((p) => p.id),
      names: nicknameById,
      teamNames,
    });
    if (merged.conflicts.length) {
      setGeneration({ kind: "issues", messages: merged.conflicts, key });
      setPanelOpen(true);
      return;
    }
    startGenerating(async () => {
      await nextFrame();
      const result = balanceTeams(balancer, merged.constraints, { previousTeams });
      startGenerating(() => {
        setGeneration(
          result.alternatives.length
            ? { kind: "result", result, constraints: merged.constraints, key }
            : { kind: "issues", messages: result.violations, key },
        );
        setAltIndex(0);
        setPanelOpen(true);
      });
    });
  }

  function apply(split: TeamSplit) {
    setAssignment(Object.fromEntries([...players.map((p) => [p.id, null]), ...Object.entries(assignmentFromSplit(split))]));
    setPins((current) => pinsAfterApply(current, split));
    setPanelOpen(false);
    setPinMode(false);
    toast.success("Equipos listos. Ajustalos si querés y guardalos.");
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

  const label = balanceLabel(gap);

  return (
    <div className="space-y-5">
      {/* Equilibrio: queda a la vista mientras se reparte. */}
      <div className="sticky top-[calc(3.5rem+var(--safe-top))] z-20 -mx-4 border-b border-hairline bg-background/92 px-4 py-3 backdrop-blur-md lg:static lg:mx-0 lg:rounded-xl lg:border-0 lg:panel lg:p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {(["a", "b"] as const).map((side) => (
            <div key={side} className={cn("min-w-0", side === "b" && "text-right")}>
              <p className={cn("truncate font-display text-lg leading-none font-extrabold tracking-wide uppercase", SIDE_STYLE[side].text)}>
                {teamNames[side]}
              </p>
              <p className="mt-1 text-xs text-muted-foreground tabular">
                {strength[side].count} jug. · ø {formatNumber(strength[side].avg)}
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
          aria-valuetext={
            evaluation
              ? `${BALANCE_TEXT[label]}, ${formatDecimal(evaluation.metrics.levelDiffPct)} % de diferencia`
              : "Faltan jugadores en algún equipo"
          }
        >
          {anyAssigned && (
            <>
              <span className="h-full bg-team-a transition-[width] duration-200" style={{ width: `${share * 100}%` }} />
              <span className="h-full flex-1 bg-team-b" />
            </>
          )}
        </div>
        <p className="mt-1.5 text-center text-xs text-muted-foreground" aria-hidden="true">
          {evaluation ? (
            <>
              <span className={cn("font-semibold", BALANCE_TONE[label])}>{BALANCE_TEXT[label]}</span> ·{" "}
              {formatDecimal(evaluation.metrics.levelDiffPct)} % de diferencia
            </>
          ) : anyAssigned ? (
            "Cada equipo necesita al menos un jugador"
          ) : (
            "Repartí a los jugadores o generá equipos parejos"
          )}
        </p>
        {evaluation?.forecast && (
          <p className="mt-0.5 truncate text-center text-2xs text-muted-foreground tabular">
            <span className="sr-only">Pronóstico: </span>
            {formatWinProbability(evaluation.forecast, teamNames)}
          </p>
        )}
      </div>

      {finished && (
        <p className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-sm text-warning ring-1 ring-warning/25 ring-inset">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          El partido ya tiene resultado: si cambiás a alguien de equipo, se descartan sus goles y asistencias. La corrección queda registrada.
        </p>
      )}

      <div className="space-y-3">
        <Button
          type="button"
          size="lg"
          className="w-full lg:w-auto"
          onClick={generate}
          disabled={!canGenerate || isGenerating}
          aria-busy={isGenerating || undefined}
          aria-describedby={canGenerate ? undefined : "generar-ayuda"}
        >
          {isGenerating ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
          {isGenerating ? "Buscando el mejor armado…" : generation ? "Generar de nuevo" : "Generar parejos"}
        </Button>
        {!canGenerate && (
          <p id="generar-ayuda" className="text-xs text-muted-foreground">
            Con {MIN_PLAYERS} titulares o más se pueden generar equipos parejos. Mientras, armalos a mano.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={pinMode ? "default" : "secondary"}
            size="sm"
            onClick={() => setPinMode((v) => !v)}
            aria-pressed={pinMode}
            disabled={!anyAssigned && !pinMode}
          >
            <Pin aria-hidden="true" />
            Fijar
            {pinnedCount > 0 && <span className="tabular">· {pinnedCount}</span>}
          </Button>
          <TeamRulesSheet
            groupId={groupId}
            rules={rules}
            players={players.map((p) => ({ id: p.id, nickname: p.nickname, avatarUrl: p.avatarUrl }))}
            canEdit={canEditRules}
            rulesHref={rulesHref}
          />
          <Button type="button" variant="secondary" size="sm" onClick={snake} disabled={players.length < 2}>
            <Shuffle aria-hidden="true" />
            Mezclar por nivel
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={clearAll} disabled={!anyAssigned}>
            <Eraser aria-hidden="true" />
            Vaciar
          </Button>
        </div>
        {(pinMode || pinnedCount > 0) && (
          <div className="flex items-center gap-2 rounded-lg bg-primary/8 px-3 py-1 text-xs text-muted-foreground ring-1 ring-primary/20 ring-inset">
            <Pin className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <p className="min-w-0 flex-1 py-1.5" aria-live="polite">
              {pinMode
                ? "Tocá a un jugador de un equipo para fijarlo ahí. Al generar, los fijados no se mueven."
                : `${pinnedCount} ${pinnedCount === 1 ? "fijado" : "fijados"} para generar.`}
            </p>
            {pinnedCount > 0 && (
              <button
                type="button"
                onClick={() => setPins({})}
                className="inline-flex min-h-11 shrink-0 items-center gap-1 font-semibold text-foreground underline-offset-4 hover:underline"
              >
                <PinOff className="size-3.5" aria-hidden="true" />
                Soltar todos
              </button>
            )}
          </div>
        )}
      </div>

      {generation?.kind === "issues" && panelOpen && (
        <GeneratorIssues
          messages={generation.messages}
          hint={
            pinnedCount > 0
              ? "Soltá algún jugador fijado o revisá las reglas de armado del grupo."
              : "Revisá las reglas de armado del grupo: hay parejas que no se pueden cumplir a la vez."
          }
          onClose={() => setPanelOpen(false)}
          actions={
            pinnedCount > 0 && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setPins({})}>
                <PinOff aria-hidden="true" />
                Soltar fijados
              </Button>
            )
          }
        />
      )}

      {generation?.kind === "result" &&
        (panelOpen ? (
          <GeneratorPanel
            result={generation.result}
            index={altIndex}
            onIndexChange={setAltIndex}
            onApply={apply}
            players={generatorPlayers}
            balancerPlayers={balancer}
            constraints={generation.constraints}
            teamNames={teamNames}
            pins={pins}
            appliedIndex={appliedIndex >= 0 ? appliedIndex : null}
            stale={generation.key !== generationKey}
            onRegenerate={generate}
            onClose={() => setPanelOpen(false)}
          />
        ) : (
          <div className="panel flex min-h-14 items-center gap-3 rounded-xl py-1.5 pr-1.5 pl-4">
            <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm">
              {appliedIndex >= 0 ? (
                <>
                  Usando la opción {appliedIndex + 1} de {alternatives.length}
                </>
              ) : (
                <>
                  {alternatives.length} {alternatives.length === 1 ? "opción generada" : "opciones generadas"}
                </>
              )}
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPanelOpen(true)}>
              Ver opciones
            </Button>
          </div>
        ))}

      <div className="grid grid-cols-2 gap-2 lg:gap-3">
        {(["a", "b"] as const).map((side) => (
          <section
            key={side}
            aria-label={`Equipo ${teamNames[side]}`}
            className={cn("panel relative min-w-0 rounded-xl", pinMode && "ring-primary/40")}
          >
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
                {groups[side].map((player) => {
                  const pinned = pins[player.id] === side;
                  return (
                    <li key={player.id}>
                      <button
                        type="button"
                        onClick={() => tapTeamPlayer(player.id, side)}
                        aria-pressed={pinMode ? pinned : undefined}
                        aria-label={
                          pinMode
                            ? `${player.nickname}: ${pinned ? "fijado, soltar" : `fijar en ${teamNames[side]}`}`
                            : `${player.nickname}${pinned ? " (fijado)" : ""}: pasar a ${side === "a" ? teamNames.b : "sin equipo"}`
                        }
                        className={cn(
                          "pressable flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ring-1 ring-inset",
                          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                          SIDE_STYLE[side].chip,
                          pinMode && pinned && "ring-2 ring-primary",
                        )}
                      >
                        <UserAvatar name={player.nickname} src={player.avatarUrl} size="xs" />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{player.nickname}</span>
                        {pinned && <Pin className="size-3.5 shrink-0 text-primary" aria-hidden="true" />}
                        <span className="shrink-0 font-display text-sm font-bold text-muted-foreground tabular">
                          {formatNumber(player.rating)}
                        </span>
                      </button>
                    </li>
                  );
                })}
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
          <p className="text-xs text-muted-foreground">
            {pinMode ? "Modo fijar: tocá a alguien de un equipo." : "Tocá un jugador de un equipo para cambiarlo."}
          </p>
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
                    aria-label={`${player.nickname} a ${teamNames[side]}`}
                    className={cn(
                      "pressable grid size-11 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold uppercase ring-1 ring-inset",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      SIDE_STYLE[side].chip,
                      SIDE_STYLE[side].text,
                    )}
                  >
                    {teamNames[side].slice(0, 1)}
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
          variant={generation?.kind === "result" && panelOpen ? "secondary" : "default"}
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
