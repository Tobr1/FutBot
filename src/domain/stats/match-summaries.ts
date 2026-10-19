/**
 * Partidos jugados reconstruidos desde `player_match_lines`: equipos,
 * marcador y aporte de cada jugador. Base común de premios, rivalidades,
 * pronósticos y análisis. Puro.
 */

import type { Side } from "@/domain/rating";
import type { MatchLineRow } from "./engine-input";
import { type DateRange, instantInRange } from "./seasons";

export interface MatchSummary {
  matchId: string;
  scheduledAt: string;
  teams: Record<Side, string[]>;
  score: Record<Side, number>;
  /** Líneas de cada jugador del partido, por id. */
  lines: Map<string, MatchLineRow>;
}

export const otherSide = (side: Side): Side => (side === "a" ? "b" : "a");

/** Compara por fecha y, a igualdad, por id (el mismo orden que el motor). */
export function compareChronological(x: { scheduledAt: string; matchId: string }, y: { scheduledAt: string; matchId: string }): number {
  const tx = Date.parse(x.scheduledAt);
  const ty = Date.parse(y.scheduledAt);
  if (Number.isFinite(tx) && Number.isFinite(ty) && tx !== ty) return tx - ty;
  if (x.scheduledAt !== y.scheduledAt) return x.scheduledAt < y.scheduledAt ? -1 : 1;
  return x.matchId < y.matchId ? -1 : x.matchId > y.matchId ? 1 : 0;
}

/** Partidos en orden cronológico (del más viejo al más nuevo). Un jugador repetido cuenta una sola vez. */
export function summarizeMatches(lines: readonly MatchLineRow[]): MatchSummary[] {
  const byId = new Map<string, MatchSummary>();
  for (const line of lines) {
    let match = byId.get(line.matchId);
    if (!match) {
      match = { matchId: line.matchId, scheduledAt: line.scheduledAt, teams: { a: [], b: [] }, score: { a: 0, b: 0 }, lines: new Map() };
      byId.set(line.matchId, match);
    }
    if (match.lines.has(line.playerId)) continue;
    match.lines.set(line.playerId, line);
    match.teams[line.side].push(line.playerId);
    match.score[line.side] = line.goalsFor;
    match.score[otherSide(line.side)] = line.goalsAgainst;
  }
  return [...byId.values()].sort(compareChronological);
}

/** Líneas cuyo partido cae en el rango de fechas locales (temporada). */
export function linesInRange(lines: readonly MatchLineRow[], range: DateRange, timeZone: string): MatchLineRow[] {
  if (!range.from && !range.to) return [...lines];
  return lines.filter((l) => instantInRange(l.scheduledAt, range, timeZone));
}

/** Resultado de un lado: "win" | "draw" | "loss". */
export function sideResult(match: Pick<MatchSummary, "score">, side: Side): "win" | "draw" | "loss" {
  const own = match.score[side];
  const rival = match.score[otherSide(side)];
  return own > rival ? "win" : own === rival ? "draw" : "loss";
}
