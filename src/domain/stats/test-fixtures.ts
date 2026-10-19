/**
 * Fixtures para tests: arma filas de `player_match_lines` a partir de un
 * partido descripto en una línea. Solo lo usan los tests.
 */

import type { MatchLineRow } from "./engine-input";

export interface LineExtras {
  g?: number;
  a?: number;
  og?: number;
  mvp?: boolean;
}

export function matchLines(
  matchId: string,
  scheduledAt: string,
  teamA: readonly string[],
  teamB: readonly string[],
  score: readonly [number, number],
  extras: Readonly<Record<string, LineExtras>> = {},
): MatchLineRow[] {
  const line = (playerId: string, side: "a" | "b"): MatchLineRow => ({
    matchId,
    playerId,
    side,
    scheduledAt,
    goalsFor: side === "a" ? score[0] : score[1],
    goalsAgainst: side === "a" ? score[1] : score[0],
    goals: extras[playerId]?.g ?? 0,
    assists: extras[playerId]?.a ?? 0,
    ownGoals: extras[playerId]?.og ?? 0,
    isMvp: extras[playerId]?.mvp ?? false,
  });
  return [...teamA.map((id) => line(id, "a")), ...teamB.map((id) => line(id, "b"))];
}

/** Sábados consecutivos a las 22 h de Buenos Aires (01:00 Z del domingo), desde el 3/10/2026. */
export function saturday(index: number): string {
  const base = Date.UTC(2026, 9, 4, 1, 0, 0);
  return new Date(base + index * 7 * 86_400_000).toISOString();
}
