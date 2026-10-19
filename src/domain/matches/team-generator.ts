/**
 * Puente entre los datos del partido y el optimizador de equipos
 * (src/domain/balancer): arma los BalancerPlayer con la valoración del motor,
 * junta las reglas persistentes del grupo con los fijados de la sesión,
 * elige los equipos previos para el término de variedad y formatea el
 * pronóstico. Puro, sin IO.
 */
import type { BalancerPlayer, Constraints, Side, TeamSplit } from "@/domain/balancer";
import type { PlayerPositions } from "@/domain/players/positions";
import { confidenceFor, resolveRatingConfig, sigmaFor, type WinProbability, winProbability } from "@/domain/rating";

// ---------------------------------------------------------------------------
// Jugadores
// ---------------------------------------------------------------------------

export interface GeneratorSource {
  id: string;
  nickname: string;
  /** Nivel inicial (respaldo si el motor no tiene datos). */
  baseRating: number;
  positions: PlayerPositions;
}

/** Lo que el motor de valoración sabe de un jugador (subset de PlayerRating). */
export interface EngineSkill {
  skill: number;
  sigma: number;
  recentForm: number | null;
}

const RATING_CONFIG = resolveRatingConfig();

/** σ de un jugador sin ningún partido (incertidumbre máxima del motor). */
export const UNKNOWN_SIGMA = RATING_CONFIG.uncertainty.sigma0;

/**
 * Desde esta σ un jugador cuenta como "nuevo" en la explicación. Coincide con
 * el distintivo "Provisional" del motor: menos de `provisionalMatches` partidos.
 */
export const NEW_PLAYER_SIGMA =
  sigmaFor(confidenceFor(Math.max(0, RATING_CONFIG.confidence.provisionalMatches - 1), RATING_CONFIG), RATING_CONFIG) - 1e-9;

const finite = (value: number | null | undefined): value is number => typeof value === "number" && Number.isFinite(value);

/** Jugador para el optimizador: habilidad del motor (o nivel inicial), σ, forma y posiciones. */
export function toBalancerPlayer(source: GeneratorSource, engine?: EngineSkill | null): BalancerPlayer {
  const hasEngine = Boolean(engine && finite(engine.skill));
  const primary = source.positions.primary;
  const secondary = source.positions.secondary && source.positions.secondary !== primary ? source.positions.secondary : null;
  return {
    id: source.id,
    name: source.nickname,
    skill: hasEngine ? engine!.skill : source.baseRating,
    sigma: hasEngine && finite(engine!.sigma) ? engine!.sigma : UNKNOWN_SIGMA,
    form: hasEngine && finite(engine!.recentForm) ? engine!.recentForm : 0,
    primary,
    secondary,
  };
}

// ---------------------------------------------------------------------------
// Restricciones
// ---------------------------------------------------------------------------

export type TeamRuleKind = "together" | "apart";

export interface TeamRule {
  id: string;
  playerA: string;
  playerB: string;
  kind: TeamRuleKind;
  note: string | null;
}

export const TEAM_RULE_LABELS: Record<TeamRuleKind, string> = { together: "Juntos", apart: "Separados" };

export const TEAM_RULE_NOTE_MAX = 120;

/** Clave de un par sin importar el orden. */
export function pairKey(x: string, y: string): string {
  return x < y ? `${x}|${y}` : `${y}|${x}`;
}

export interface MergedConstraints {
  constraints: Constraints;
  /** Reglas del grupo que aplican (los dos jugadores están en el partido), sin repetidos. */
  activeRules: TeamRule[];
  /** Contradicciones que impiden generar, con el texto para el usuario. */
  conflicts: string[];
}

/**
 * Reglas persistentes del grupo + fijados de la sesión → restricciones del optimizador.
 * Solo cuentan los jugadores del partido. Detecta contradicciones directas
 * (la misma pareja juntos y separados, juntos con fijados en equipos distintos,
 * separados fijados en el mismo equipo); las indirectas las informa el optimizador.
 */
export function mergeConstraints({
  rules,
  pins,
  playerIds,
  names = {},
  teamNames = { a: "A", b: "B" },
}: {
  rules: readonly TeamRule[];
  pins: Readonly<Record<string, Side>>;
  playerIds: Iterable<string>;
  names?: Readonly<Record<string, string>>;
  teamNames?: Record<Side, string>;
}): MergedConstraints {
  const present = new Set(playerIds);
  const nameOf = (id: string) => names[id] ?? id;
  const conflicts: string[] = [];

  const pinned: Record<string, Side> = {};
  for (const [id, side] of Object.entries(pins)) if (present.has(id)) pinned[id] = side;

  const byPair = new Map<string, TeamRule>();
  for (const rule of rules) {
    if (rule.playerA === rule.playerB || !present.has(rule.playerA) || !present.has(rule.playerB)) continue;
    const key = pairKey(rule.playerA, rule.playerB);
    const existing = byPair.get(key);
    if (!existing) byPair.set(key, rule);
    else if (existing.kind !== rule.kind) {
      conflicts.push(`${nameOf(rule.playerA)} y ${nameOf(rule.playerB)} tienen una regla de juntos y otra de separados.`);
    }
  }
  const activeRules = [...byPair.values()];

  const together: Array<[string, string]> = [];
  const apart: Array<[string, string]> = [];
  for (const rule of activeRules) {
    const pair: [string, string] = [rule.playerA, rule.playerB];
    const pa = pinned[rule.playerA];
    const pb = pinned[rule.playerB];
    const label = `${nameOf(rule.playerA)} y ${nameOf(rule.playerB)}`;
    if (rule.kind === "together") {
      together.push(pair);
      if (pa && pb && pa !== pb) conflicts.push(`${label} tienen que jugar juntos, pero están fijados en equipos distintos.`);
    } else {
      apart.push(pair);
      if (pa && pb && pa === pb) conflicts.push(`${label} tienen que jugar separados, pero los dos están fijados en ${teamNames[pa]}.`);
    }
  }

  const constraints: Constraints = {};
  if (Object.keys(pinned).length) constraints.pinned = pinned;
  if (together.length) constraints.together = together;
  if (apart.length) constraints.apart = apart;
  return { constraints, activeRules, conflicts };
}

/** Fijados después de mover a un jugador: el fijado lo sigue a su nuevo equipo; sin equipo, se suelta. */
export function pinsAfterMove(pins: Readonly<Record<string, Side>>, id: string, side: Side | null): Record<string, Side> {
  if (!(id in pins)) return { ...pins };
  const next = { ...pins };
  if (side) next[id] = side;
  else delete next[id];
  return next;
}

/** Fija a un jugador en su equipo actual o lo suelta si ya estaba fijado. */
export function togglePin(pins: Readonly<Record<string, Side>>, id: string, side: Side | null): Record<string, Side> {
  const next = { ...pins };
  if (id in next || !side) delete next[id];
  else next[id] = side;
  return next;
}

/** Clave estable de los fijados (para saber si una generación quedó vieja). */
export function pinsKey(pins: Readonly<Record<string, Side>>): string {
  return Object.entries(pins)
    .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
    .map(([id, side]) => `${id}:${side}`)
    .join(",");
}

// ---------------------------------------------------------------------------
// Equipos previos (variedad)
// ---------------------------------------------------------------------------

export interface PastLine {
  matchId: string;
  playerId: string;
  side: Side;
  /** ISO 8601 */
  scheduledAt: string;
}

/**
 * Equipos del último partido jugado del grupo (para no repetir siempre los mismos).
 * Ignora el partido que se está armando y, con `before`, los posteriores a esa fecha.
 */
export function choosePreviousTeams(
  lines: readonly PastLine[],
  options: { excludeMatchId?: string; before?: string } = {},
): { matchId: string; a: string[]; b: string[] } | undefined {
  let best: PastLine | undefined;
  for (const line of lines) {
    if (line.matchId === options.excludeMatchId) continue;
    if (options.before && !(Date.parse(line.scheduledAt) < Date.parse(options.before))) continue;
    if (
      !best ||
      line.scheduledAt > best.scheduledAt ||
      (line.scheduledAt === best.scheduledAt && line.matchId > best.matchId)
    ) {
      best = line;
    }
  }
  if (!best) return undefined;
  const matchId = best.matchId;
  const a: string[] = [];
  const b: string[] = [];
  for (const line of lines) if (line.matchId === matchId) (line.side === "a" ? a : b).push(line.playerId);
  return a.length && b.length ? { matchId, a, b } : undefined;
}

// ---------------------------------------------------------------------------
// Resultado del optimizador
// ---------------------------------------------------------------------------

/** Asignación jugador → equipo a partir de una alternativa. */
export function assignmentFromSplit(split: Pick<TeamSplit, "a" | "b">): Record<string, Side> {
  return Object.fromEntries([...split.a.map((id) => [id, "a"] as const), ...split.b.map((id) => [id, "b"] as const)]);
}

/**
 * Fijados después de aplicar una alternativa: como al mover a mano, cada
 * fijado sigue a su jugador al equipo que le tocó y se suelta si quedó sin
 * equipo. Así nunca queda un fijado en un equipo distinto del que se ve
 * (pasa al aplicar una alternativa generada antes de cambiar los fijados).
 */
export function pinsAfterApply(pins: Readonly<Record<string, Side>>, split: Pick<TeamSplit, "a" | "b">): Record<string, Side> {
  const sides = assignmentFromSplit(split);
  const next: Record<string, Side> = {};
  for (const id of Object.keys(pins)) if (sides[id]) next[id] = sides[id];
  return next;
}

/** La asignación actual es exactamente esta alternativa (mismos colores, nadie sin equipo). */
export function matchesSplit(assignment: Readonly<Record<string, Side | null>>, split: Pick<TeamSplit, "a" | "b">): boolean {
  const assigned = Object.values(assignment).filter(Boolean).length;
  if (assigned !== split.a.length + split.b.length) return false;
  return split.a.every((id) => assignment[id] === "a") && split.b.every((id) => assignment[id] === "b");
}

/** Proporción (0-1) de la suma de niveles que tiene el equipo A. */
export function shareOf(metrics: { sumA: number; sumB: number }): number {
  const total = metrics.sumA + metrics.sumB;
  return total > 0 ? metrics.sumA / total : 0.5;
}

// ---------------------------------------------------------------------------
// Pronóstico
// ---------------------------------------------------------------------------

export interface RoundedProbability {
  a: number;
  draw: number;
  b: number;
}

/** Porcentajes enteros que suman 100 (resto mayor). */
export function roundProbabilities(p: WinProbability): RoundedProbability {
  const keys = ["a", "draw", "b"] as const;
  const raw = keys.map((k) => Math.max(0, finite(p[k]) ? p[k] : 0));
  const total = raw.reduce((acc, v) => acc + v, 0);
  if (total <= 0) return { a: 33, draw: 34, b: 33 };
  const scaled = raw.map((v) => (v / total) * 100);
  const floors = scaled.map(Math.floor);
  let rest = 100 - floors.reduce((acc, v) => acc + v, 0);
  const order = scaled.map((v, i) => [v - floors[i], i] as const).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
  for (const [, i] of order) {
    if (rest <= 0) break;
    floors[i] += 1;
    rest -= 1;
  }
  return { a: floors[0], draw: floors[1], b: floors[2] };
}

/** "Azul 54 % · Empate 22 % · Rojo 24 %" (espacio duro antes del %, para que no se corte). */
export function formatWinProbability(p: WinProbability, names: Record<Side, string>): string {
  const r = roundProbabilities(p);
  return `${names.a} ${r.a} % · Empate ${r.draw} % · ${names.b} ${r.b} %`;
}

/** Pronóstico de un armado con la habilidad de cada jugador; null si algún equipo está vacío. */
export function teamForecast(
  teams: { a: readonly string[]; b: readonly string[] },
  skillOf: (id: string) => number | undefined,
): WinProbability | null {
  if (!teams.a.length || !teams.b.length) return null;
  const skills = (ids: readonly string[]) => ids.map(skillOf).filter(finite);
  return winProbability(skills(teams.a), skills(teams.b));
}
