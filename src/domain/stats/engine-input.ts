/**
 * Arma la entrada del motor de valoración a partir de las filas de SQL
 * (`player_match_lines` y `get_rating_aggregates`), opcionalmente recortada
 * a un rango de fechas locales (temporada).
 */

import type { MatchHistory, PlayerLine, PlayerProfile, RatingAggregate, RatingInput, Side } from "@/domain/rating";
import { type DateRange, instantInRange } from "./seasons";

/** Una fila de `player_match_lines` ya tipada. */
export interface MatchLineRow {
  matchId: string;
  playerId: string;
  side: Side;
  scheduledAt: string;
  goalsFor: number;
  goalsAgainst: number;
  goals: number;
  assists: number;
  ownGoals: number;
  isMvp: boolean;
}

export interface HistorySource {
  players: readonly PlayerProfile[];
  lines: readonly MatchLineRow[];
  aggregates: readonly RatingAggregate[];
}

export function buildRatingInput(source: HistorySource, options: { range: DateRange; timeZone: string }): RatingInput {
  const lines = source.lines.filter((l) => instantInRange(l.scheduledAt, options.range, options.timeZone));

  const matches = new Map<string, MatchHistory>();
  for (const line of lines) {
    let match = matches.get(line.matchId);
    if (!match) {
      match = { matchId: line.matchId, playedAt: line.scheduledAt, teams: { a: [], b: [] }, score: { a: 0, b: 0 } };
      matches.set(line.matchId, match);
    }
    match.teams[line.side].push(line.playerId);
    // Cada fila trae el marcador desde su lado: se guarda como A/B.
    match.score[line.side] = line.goalsFor;
    match.score[line.side === "a" ? "b" : "a"] = line.goalsAgainst;
  }

  const playerLines: PlayerLine[] = lines.map((l) => ({
    matchId: l.matchId,
    playerId: l.playerId,
    side: l.side,
    goals: l.goals,
    assists: l.assists,
    ownGoals: l.ownGoals,
    isMvp: l.isMvp,
  }));

  return {
    players: source.players,
    matches: [...matches.values()],
    lines: playerLines,
    aggregates: source.aggregates.filter((a) => matches.has(a.matchId)),
  };
}
