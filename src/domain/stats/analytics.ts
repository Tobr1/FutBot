/**
 * Análisis del grupo: goles por partido, reparto de resultados (Azul / Rojo /
 * empate), diferencia de gol media y asistencia. Puro: recibe las líneas ya
 * recortadas a la temporada elegida.
 */

import { isoToZoned } from "@/domain/matches/datetime";
import type { MatchLineRow } from "./engine-input";
import { summarizeMatches } from "./match-summaries";

export interface GoalsPoint {
  matchId: string;
  /** "25/10". */
  label: string;
  goals: number;
  /** Media móvil de los últimos `window` partidos (incluido este). */
  average: number;
}

/** Goles por partido en orden cronológico con su media móvil (últimos `limit` partidos). */
export function goalsTrend(lines: readonly MatchLineRow[], timeZone: string, options: { window?: number; limit?: number } = {}): GoalsPoint[] {
  const window = Math.max(1, options.window ?? 5);
  const matches = summarizeMatches(lines);
  const totals = matches.map((m) => m.score.a + m.score.b);
  const points = matches.map((m, i) => {
    const slice = totals.slice(Math.max(0, i - window + 1), i + 1);
    const [, month, day] = isoToZoned(m.scheduledAt, timeZone).date.split("-");
    return {
      matchId: m.matchId,
      label: `${day}/${month}`,
      goals: totals[i],
      average: Math.round((slice.reduce((s, v) => s + v, 0) / slice.length) * 100) / 100,
    };
  });
  return points.slice(-Math.max(1, options.limit ?? 30));
}

export interface ResultDistribution {
  matches: number;
  aWins: number;
  bWins: number;
  draws: number;
  totalGoals: number;
  /** null sin partidos. */
  goalsPerMatch: number | null;
  /** Diferencia de gol media (en valor absoluto); null sin partidos. */
  averageMargin: number | null;
  /** Partidos definidos por un gol. */
  oneGoalGames: number;
}

export function resultDistribution(lines: readonly MatchLineRow[]): ResultDistribution {
  const matches = summarizeMatches(lines);
  let aWins = 0;
  let bWins = 0;
  let draws = 0;
  let totalGoals = 0;
  let margin = 0;
  let oneGoalGames = 0;
  for (const m of matches) {
    const diff = m.score.a - m.score.b;
    if (diff > 0) aWins += 1;
    else if (diff < 0) bWins += 1;
    else draws += 1;
    totalGoals += m.score.a + m.score.b;
    margin += Math.abs(diff);
    if (Math.abs(diff) === 1) oneGoalGames += 1;
  }
  const n = matches.length;
  return {
    matches: n,
    aWins,
    bWins,
    draws,
    totalGoals,
    goalsPerMatch: n > 0 ? totalGoals / n : null,
    averageMargin: n > 0 ? margin / n : null,
    oneGoalGames,
  };
}

export interface AttendanceEntry {
  playerId: string;
  matches: number;
  /** Proporción de los partidos del período, entre 0 y 1. */
  share: number;
}

/** Los que más partidos jugaron en el período. */
export function attendanceTop(lines: readonly MatchLineRow[], limit = 10): AttendanceEntry[] {
  const matches = summarizeMatches(lines);
  const counts = new Map<string, number>();
  for (const m of matches) for (const id of m.lines.keys()) counts.set(id, (counts.get(id) ?? 0) + 1);
  const total = matches.length;
  return [...counts.entries()]
    .map(([playerId, n]) => ({ playerId, matches: n, share: total > 0 ? n / total : 0 }))
    .sort((x, y) => y.matches - x.matches || (x.playerId < y.playerId ? -1 : 1))
    .slice(0, Math.max(0, limit));
}

/** Descripción accesible del gráfico de goles. */
export function goalsTrendSummary(points: readonly GoalsPoint[]): string {
  if (points.length === 0) return "Todavía no hay partidos jugados.";
  const total = points.reduce((s, p) => s + p.goals, 0);
  const max = points.reduce((acc, p) => (p.goals > acc.goals ? p : acc));
  const avg = (total / points.length).toFixed(1).replace(".", ",");
  return `${points.length} ${points.length === 1 ? "partido" : "partidos"}, ${avg} goles por partido en promedio; el de más goles fue el ${max.label} con ${max.goals}.`;
}
