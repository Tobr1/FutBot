/**
 * Partidos de un jugador para la ficha: resultado, marcador y aporte.
 * Y la valoración que se muestra: la del motor, con el nivel inicial como
 * respaldo mientras no haya datos.
 */

import type { MatchLineRow } from "./engine-input";

export type MatchResult = "win" | "draw" | "loss";

export const RESULT_LABELS: Record<MatchResult, { short: string; long: string }> = {
  win: { short: "V", long: "Victoria" },
  draw: { short: "E", long: "Empate" },
  loss: { short: "D", long: "Derrota" },
};

export function resultOf(goalsFor: number, goalsAgainst: number): MatchResult {
  return goalsFor > goalsAgainst ? "win" : goalsFor === goalsAgainst ? "draw" : "loss";
}

/** Últimos `n` partidos del jugador, del más reciente al más viejo. */
export function recentLines(lines: readonly MatchLineRow[], playerId: string, n = 5): MatchLineRow[] {
  return lines
    .filter((l) => l.playerId === playerId)
    .sort((a, b) => (a.scheduledAt < b.scheduledAt ? 1 : a.scheduledAt > b.scheduledAt ? -1 : a.matchId < b.matchId ? 1 : -1))
    .slice(0, Math.max(0, n));
}

/** "2 G · 1 A", "1 G", "Sin goles". */
export function contributionText({ goals, assists }: { goals: number; assists: number }): string {
  const parts: string[] = [];
  if (goals > 0) parts.push(`${goals} G`);
  if (assists > 0) parts.push(`${assists} A`);
  return parts.length > 0 ? parts.join(" · ") : "Sin goles";
}

export interface EngineRatingLike {
  skill: number;
  isProvisional: boolean;
}

export interface DisplayRating {
  rating: number;
  isProvisional: boolean;
}

/** Valoración visible: la habilidad del motor o, sin datos, el nivel inicial (provisional). */
export function displayRating(baseRating: number, engine: EngineRatingLike | null | undefined): DisplayRating {
  if (engine && Number.isFinite(engine.skill)) return { rating: engine.skill, isProvisional: engine.isProvisional };
  return { rating: baseRating, isProvisional: true };
}
