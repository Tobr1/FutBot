/**
 * Resultado de un partido: marcador, goles, asistencias y goles en contra.
 * Las validaciones espejan record_match_result (la base es la última
 * palabra): goles acreditados ≤ marcador y asistencias ≤ goles por equipo.
 * El marcador es el resultado oficial: puede haber goles sin autor (D-005).
 */

export type Side = "a" | "b";
export const SIDES: readonly Side[] = ["a", "b"];

export const MAX_SCORE = 99;

export const otherSide = (side: Side): Side => (side === "a" ? "b" : "a");

/** Ganador del partido o empate. */
export function outcome(scoreA: number, scoreB: number): Side | "draw" {
  if (scoreA === scoreB) return "draw";
  return scoreA > scoreB ? "a" : "b";
}

/** Resultado desde el punto de vista de un equipo. */
export function sideResult(side: Side, scoreA: number, scoreB: number): "win" | "draw" | "loss" {
  const result = outcome(scoreA, scoreB);
  if (result === "draw") return "draw";
  return result === side ? "win" : "loss";
}

/** Un gol en contra suma para el rival de quien lo hizo. */
export function ownGoalBeneficiary(authorSide: Side): Side {
  return otherSide(authorSide);
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_SCORE, Math.max(0, Math.trunc(value)));
}

export interface OwnGoal {
  /** Equipo al que se le suma el gol. */
  beneficiary: Side;
  /** Jugador del equipo rival que lo hizo, o null si no se sabe. */
  playerId: string | null;
}

export interface ResultDraft {
  scoreA: number;
  scoreB: number;
  /** Goles por jugador (playerId → cantidad). */
  goals: Record<string, number>;
  /** Asistencias por jugador. */
  assists: Record<string, number>;
  ownGoals: OwnGoal[];
}

export type SideOf = (playerId: string) => Side | null;

export interface SideCheck {
  score: number;
  /** Goles hechos por jugadores del equipo. */
  playerGoals: number;
  /** Goles en contra del rival que suman para este equipo. */
  ownGoalsFor: number;
  /** playerGoals + ownGoalsFor. */
  credited: number;
  /** Goles del marcador sin autor asignado (nunca negativo). */
  unassigned: number;
  assists: number;
  goalsExceedScore: boolean;
  assistsExceedGoals: boolean;
}

export type ResultIssue =
  | { kind: "goals_exceed_score"; side: Side }
  | { kind: "assists_exceed_goals"; side: Side }
  | { kind: "player_not_in_match"; playerId: string }
  | { kind: "own_goal_wrong_team"; playerId: string };

export interface ResultCheck {
  a: SideCheck;
  b: SideCheck;
  issues: ResultIssue[];
  valid: boolean;
}

const sum = (values: Iterable<number>) => {
  let total = 0;
  for (const value of values) total += value;
  return total;
};

/** Valida un borrador de resultado contra la composición de los equipos. */
export function checkResult(draft: ResultDraft, sideOf: SideOf): ResultCheck {
  const issues: ResultIssue[] = [];
  const playerGoals: Record<Side, number> = { a: 0, b: 0 };
  const assists: Record<Side, number> = { a: 0, b: 0 };
  const ownGoalsFor: Record<Side, number> = { a: 0, b: 0 };
  const missing = new Set<string>();

  const tally = (counts: Record<string, number>, target: Record<Side, number>) => {
    for (const [playerId, count] of Object.entries(counts)) {
      if (count <= 0) continue;
      const side = sideOf(playerId);
      if (!side) {
        missing.add(playerId);
        continue;
      }
      target[side] += count;
    }
  };
  tally(draft.goals, playerGoals);
  tally(draft.assists, assists);

  for (const ownGoal of draft.ownGoals) {
    if (ownGoal.playerId) {
      const side = sideOf(ownGoal.playerId);
      if (!side) {
        missing.add(ownGoal.playerId);
        continue;
      }
      if (side === ownGoal.beneficiary) {
        issues.push({ kind: "own_goal_wrong_team", playerId: ownGoal.playerId });
        continue;
      }
    }
    ownGoalsFor[ownGoal.beneficiary] += 1;
  }
  for (const playerId of missing) issues.push({ kind: "player_not_in_match", playerId });

  const build = (side: Side): SideCheck => {
    const score = side === "a" ? draft.scoreA : draft.scoreB;
    const credited = playerGoals[side] + ownGoalsFor[side];
    const check: SideCheck = {
      score,
      playerGoals: playerGoals[side],
      ownGoalsFor: ownGoalsFor[side],
      credited,
      unassigned: Math.max(0, score - credited),
      assists: assists[side],
      goalsExceedScore: credited > score,
      assistsExceedGoals: assists[side] > playerGoals[side],
    };
    if (check.goalsExceedScore) issues.push({ kind: "goals_exceed_score", side });
    if (check.assistsExceedGoals) issues.push({ kind: "assists_exceed_goals", side });
    return check;
  };

  const a = build("a");
  const b = build("b");
  return { a, b, issues, valid: issues.length === 0 };
}

/** Evento tal como lo recibe la RPC record_match_result. */
export type MatchEventInput =
  | { event_type: "goal" | "assist"; player_id: string }
  | { event_type: "own_goal"; player_id: string }
  | { event_type: "own_goal"; team_side: Side };

/** Borrador → lista de eventos para la RPC (orden estable: goles, en contra, asistencias). */
export function draftToEvents(draft: ResultDraft): MatchEventInput[] {
  const events: MatchEventInput[] = [];
  const expand = (counts: Record<string, number>, type: "goal" | "assist") => {
    for (const [playerId, count] of Object.entries(counts).sort(([x], [y]) => x.localeCompare(y))) {
      for (let i = 0; i < count; i++) events.push({ event_type: type, player_id: playerId });
    }
  };
  expand(draft.goals, "goal");
  for (const ownGoal of draft.ownGoals) {
    events.push(
      ownGoal.playerId
        ? { event_type: "own_goal", player_id: ownGoal.playerId }
        : { event_type: "own_goal", team_side: ownGoal.beneficiary },
    );
  }
  expand(draft.assists, "assist");
  return events;
}

/** Evento guardado: `side` es el equipo acreditado (rival del autor en goles en contra). */
export interface StoredEvent {
  type: "goal" | "own_goal" | "assist";
  playerId: string | null;
  side: Side;
}

/** Eventos guardados → borrador editable (para corregir un resultado). */
export function eventsToDraft(scoreA: number | null, scoreB: number | null, events: readonly StoredEvent[]): ResultDraft {
  const draft: ResultDraft = { scoreA: scoreA ?? 0, scoreB: scoreB ?? 0, goals: {}, assists: {}, ownGoals: [] };
  for (const event of events) {
    if (event.type === "own_goal") {
      draft.ownGoals.push({ beneficiary: event.side, playerId: event.playerId });
    } else if (event.playerId) {
      const target = event.type === "goal" ? draft.goals : draft.assists;
      target[event.playerId] = (target[event.playerId] ?? 0) + 1;
    }
  }
  return draft;
}

export interface PlayerTally {
  playerId: string;
  count: number;
}

export interface SideSummary {
  scorers: PlayerTally[];
  assisters: PlayerTally[];
  /** Goles en contra que sumaron para este equipo. */
  ownGoals: Array<{ playerId: string | null }>;
  /** Goles del marcador sin autor ni gol en contra. */
  unassigned: number;
}

/** Resumen por equipo para mostrar el resultado (goleadores ordenados por cantidad). */
export function summarizeEvents(
  scoreA: number,
  scoreB: number,
  events: readonly StoredEvent[],
  nameOf: (playerId: string) => string = (id) => id,
): Record<Side, SideSummary> {
  const build = (side: Side): SideSummary => {
    const goals = new Map<string, number>();
    const assists = new Map<string, number>();
    const ownGoals: Array<{ playerId: string | null }> = [];
    for (const event of events) {
      if (event.side !== side) continue;
      if (event.type === "own_goal") ownGoals.push({ playerId: event.playerId });
      else if (event.playerId) {
        const target = event.type === "goal" ? goals : assists;
        target.set(event.playerId, (target.get(event.playerId) ?? 0) + 1);
      }
    }
    const sorted = (map: Map<string, number>) =>
      [...map.entries()]
        .map(([playerId, count]) => ({ playerId, count }))
        .sort((x, y) => y.count - x.count || nameOf(x.playerId).localeCompare(nameOf(y.playerId), "es"));
    const score = side === "a" ? scoreA : scoreB;
    const credited = sum(goals.values()) + ownGoals.length;
    return { scorers: sorted(goals), assisters: sorted(assists), ownGoals, unassigned: Math.max(0, score - credited) };
  };
  return { a: build("a"), b: build("b") };
}

/** Quita del borrador lo que quedó en cero y a jugadores que ya no están en los equipos. */
export function pruneDraft(draft: ResultDraft, sideOf: SideOf): ResultDraft {
  const clean = (counts: Record<string, number>) =>
    Object.fromEntries(Object.entries(counts).filter(([id, count]) => count > 0 && sideOf(id) !== null));
  return {
    ...draft,
    goals: clean(draft.goals),
    assists: clean(draft.assists),
    ownGoals: draft.ownGoals.filter((og) => og.playerId === null || sideOf(og.playerId) === otherSide(og.beneficiary)),
  };
}
